<?php
// EduConnect LMS - Page-Aware Document Chunking & Metadata Enrichment
// Tracks page numbers through chunking so citations can reference exact pages

class RagPageTracker {
    /**
     * Extract text from a PDF with per-page tracking
     * Returns array of ['page' => int, 'text' => string] entries
     */
    public static function extractPdfWithPages(string $pdfPath): array {
        $realPath = realpath($pdfPath);
        if (!$realPath) return [];
        
        // Use PyMuPDF to extract text page-by-page as JSON
        $pyScript = <<<'PYTHON'
import fitz, sys, json
doc = fitz.open(sys.argv[1])
pages = []
for i, page in enumerate(doc):
    pages.append({"page": i + 1, "text": page.get_text()})
print(json.dumps(pages))
PYTHON;
        
        $tmpScript = tempnam(sys_get_temp_dir(), 'pdf_extract_') . '.py';
        file_put_contents($tmpScript, $pyScript);
        $output = @shell_exec('python ' . escapeshellarg($tmpScript) . ' ' . escapeshellarg($realPath));
        @unlink($tmpScript);
        
        if ($output) {
            $pages = json_decode(trim($output), true);
            if (is_array($pages)) return $pages;
        }
        
        return [];
    }
    
    /**
     * Given page-annotated text segments and chunk boundaries,
     * compute which pages each chunk spans
     * 
     * @param array $pageTexts Array of ['page' => int, 'text' => string]
     * @param array $chunks Array of chunk text strings from chunkText()
     * @return array Map of chunk_index => ['start_page' => int, 'end_page' => int, 'pages' => [int, ...]]
     */
    public static function mapChunksToPages(array $pageTexts, array $chunks): array {
        if (empty($pageTexts) || empty($chunks)) return [];

        $fullDoc = "";
        $pageBoundaries = []; // array of ['page' => int, 'start' => int, 'end' => int]
        $offset = 0;

        foreach ($pageTexts as $pt) {
            $text = $pt['text'];
            $len = strlen($text);
            $pageBoundaries[] = [
                'page' => $pt['page'],
                'start' => $offset,
                'end' => $offset + $len
            ];
            $fullDoc .= $text;
            $offset += $len;
        }

        $result = [];
        $searchOffset = 0;

        foreach ($chunks as $idx => $chunk) {
            $chunkText = trim($chunk);
            if (empty($chunkText)) {
                $result[$idx] = ['start_page' => null, 'end_page' => null, 'pages' => []];
                continue;
            }

            // Find the chunk in the full doc
            $pos = strpos($fullDoc, $chunkText, $searchOffset);
            if ($pos === false) {
                // Try again from beginning just in case
                $pos = strpos($fullDoc, $chunkText);
            }

            if ($pos !== false) {
                $chunkStart = $pos;
                $chunkEnd = $pos + strlen($chunkText);
                $searchOffset = $chunkEnd;

                $pagesFound = [];
                foreach ($pageBoundaries as $boundary) {
                    // Check for overlap
                    if ($chunkStart < $boundary['end'] && $chunkEnd > $boundary['start']) {
                        $pagesFound[] = $boundary['page'];
                    }
                }

                $pagesFound = array_unique($pagesFound);
                sort($pagesFound);
                
                if (!empty($pagesFound)) {
                    $result[$idx] = [
                        'start_page' => $pagesFound[0],
                        'end_page' => end($pagesFound),
                        'pages' => array_values($pagesFound)
                    ];
                } else {
                    $result[$idx] = ['start_page' => null, 'end_page' => null, 'pages' => []];
                }
            } else {
                $result[$idx] = ['start_page' => null, 'end_page' => null, 'pages' => []];
            }
        }

        return $result;
    }
    
    /**
     * Enrich chunk metadata with page information
     * 
     * @param array $metadata Existing metadata array
     * @param array $pageInfo Page mapping from mapChunksToPages()
     * @return array Enriched metadata with page_start, page_end, pages keys
     */
    public static function enrichMetadata(array $metadata, array $pageInfo): array {
        if (!empty($pageInfo) && isset($pageInfo['pages']) && !empty($pageInfo['pages'])) {
            $metadata['page_start'] = $pageInfo['start_page'];
            $metadata['page_end'] = $pageInfo['end_page'];
            $metadata['pages'] = $pageInfo['pages'];
            $metadata['page_citation'] = self::formatPageCitation($pageInfo['pages']);
        }
        return $metadata;
    }
    
    /**
     * Format a human-readable page citation string
     * e.g., "p. 7" or "pp. 7-9" or "pp. 3, 5, 7"
     */
    public static function formatPageCitation(array $pages): string {
        if (empty($pages)) return "";
        if (count($pages) === 1) return "p. " . $pages[0];
        
        sort($pages);
        
        // Check if contiguous
        $contiguous = true;
        for ($i = 1; $i < count($pages); $i++) {
            if ($pages[$i] !== $pages[$i-1] + 1) {
                $contiguous = false;
                break;
            }
        }
        
        if ($contiguous) {
            return "pp. " . $pages[0] . "-" . end($pages);
        } else {
            return "pp. " . implode(", ", $pages);
        }
    }
    
    /**
     * Extract text with page numbers from plain text that has
     * embedded page markers (e.g., from seed_rag_knowledge.php)
     * Format: <!-- PAGE:N --> or [PAGE N] or --- Page N ---
     */
    public static function parsePageMarkers(string $text): array {
        // Regex to match markers like <!-- PAGE:1 -->, [PAGE 2], or --- Page 3 ---
        $pattern = '/(?:<!--\s*PAGE:(\d+)\s*-->|\[PAGE\s+(\d+)\]|---\s*Page\s+(\d+)\s*---)/i';
        
        $parts = preg_split($pattern, $text, -1, PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY);
        
        $pages = [];
        $currentPage = 1; // default to page 1 if no marker at start
        $buffer = "";
        
        // Process the split parts
        foreach ($parts as $part) {
            if (is_numeric($part)) {
                // If we have accumulated text, save it to the current page
                if (trim($buffer) !== "") {
                    $pages[] = [
                        'page' => $currentPage,
                        'text' => trim($buffer)
                    ];
                    $buffer = "";
                }
                $currentPage = (int)$part;
            } else {
                $buffer .= $part;
            }
        }
        
        if (trim($buffer) !== "") {
            $pages[] = [
                'page' => $currentPage,
                'text' => trim($buffer)
            ];
        }
        
        // Ensure at least one page exists even if empty
        if (empty($pages)) {
            $pages[] = [
                'page' => 1,
                'text' => trim($text)
            ];
        }
        
        return $pages;
    }
}
