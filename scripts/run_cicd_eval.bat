@echo off
REM EduConnect-LMS External CI/CD RAG Evaluation Runner
echo ========================================================
echo   EduConnect-LMS: Running External CI/CD Evaluation Gate
echo ========================================================

python "%~dp0..\tests\rag\ci_cd\eval_harness.py"

if %ERRORLEVEL% EQU 0 (
    echo [CI/CD SUCCESS] All RAG quality gates passed successfully.
    exit /b 0
) else (
    echo [CI/CD FAILURE] Quality gates failed! Check report for regressions.
    exit /b 1
)
