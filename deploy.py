import os
import sys
import ftplib
import subprocess

def run_build():
    print("Building frontend locally...")
    frontend_dir = os.path.join(os.getcwd(), "frontend")
    
    # Run npm run build in frontend folder
    result = subprocess.run("npm run build", shell=True, cwd=frontend_dir, capture_output=True, text=True)
    if result.returncode != 0:
        print("Build failed!")
        print(result.stdout)
        print(result.stderr)
        sys.exit(1)
    print("Build successful!")

def upload_directory(ftp, local_dir, remote_dir=""):
    for name in os.listdir(local_dir):
        local_path = os.path.join(local_dir, name)
        remote_path = f"{remote_dir}/{name}" if remote_dir else name
        
        if os.path.isdir(local_path):
            # Create remote directory
            try:
                ftp.mkd(remote_path)
                print(f"Created remote directory: {remote_path}")
            except ftplib.error_perm:
                # Directory already exists, skip creation
                pass
            upload_directory(ftp, local_path, remote_path)
        else:
            # Upload file in binary mode
            with open(local_path, 'rb') as f:
                ftp.storbinary(f"STOR {remote_path}", f)
                print(f"Uploaded: {remote_path}")

def main():
    # 1. Run local npm build
    run_build()
    
    # 2. Write .htaccess locally in frontend/dist before uploading
    dist_dir = os.path.join(os.getcwd(), "frontend", "dist")
    htaccess_content = """<IfModule mod_rewrite.c>
  RewriteEngine On
  
  # Force HTTPS Redirect
  RewriteCond %{HTTPS} off
  RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
  
  RewriteBase /
  
  # Prevent loop on index.html
  RewriteRule ^index\\.html$ - [L]
  
  # Do not redirect real files or directories
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  
  # Exclude backend API requests from React routing
  RewriteCond %{REQUEST_URI} !^/backend/
  
  # Send all other requests to React frontend
  RewriteRule . /index.html [L]
</IfModule>
"""
    htaccess_path = os.path.join(dist_dir, ".htaccess")
    with open(htaccess_path, "w") as f:
        f.write(htaccess_content)
    print("Created .htaccess file in dist folder.")

    # 3. FTP Connection
    print("Connecting to FTP...")
    ftp_host = "cosmosdigital.in"
    ftp_user = "cosmosdigital@cosmosdigital.in"
    ftp_pass = "W%veHMGtm;Qf]T1}"
    
    try:
        ftp = ftplib.FTP(ftp_host)
        ftp.login(user=ftp_user, passwd=ftp_pass)
        print("Logged in successfully!")
        
        # Upload dist contents to root of FTP (corresponds to public_html/cosmosdigital.in)
        print("Uploading build files...")
        upload_directory(ftp, dist_dir)
        
        ftp.quit()
        print("\n🎉 FTP upload completed successfully!")
        print("🚀 Deployment finished! Both frontend and backend are now hosted at https://cosmosdigital.in")
    except Exception as e:
        print(f"FTP Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
