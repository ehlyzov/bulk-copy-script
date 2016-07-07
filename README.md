Howto:


1. Copy .env.sample to .env and fill it with your credentials 
1. Use split.sh <source> <target> to create archives of <source>
1. Run "npm i"
1. Run "node queue.js" to initialize data for job processing.
1. Run "pm2 start upload.js --args "<target> <path>" --name "upload" -i 4" for uploading archives to the Selectel storage (SWIFT) using 4 processes.
