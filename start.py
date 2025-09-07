#!/usr/bin/env python3
"""
Startup script for Ganesh Ji Divine Guide
"""
import os
import sys
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    logger.info("Starting Ganesh Ji Divine Guide...")
    
    # Check environment variables
    port = int(os.environ.get('PORT', 8080))
    host = os.environ.get('HOST', '0.0.0.0')
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    logger.info(f"Configuration:")
    logger.info(f"  Host: {host}")
    logger.info(f"  Port: {port}")
    logger.info(f"  Debug: {debug}")
    
    # Check API key
    api_key = os.environ.get('GOOGLE_API_KEY') or os.environ.get('GEMINI_API_KEY')
    if api_key:
        logger.info("  API Key: Configured")
    else:
        logger.warning("  API Key: Not configured")
    
    # Import and start the app
    try:
        from server import app
        logger.info("Flask app imported successfully")
        
        if debug:
            logger.info("Starting Flask development server...")
            app.run(host=host, port=port, debug=debug)
        else:
            logger.info("Starting Gunicorn production server...")
            import gunicorn.app.wsgiapp as wsgi
            sys.argv = [
                'gunicorn',
                '--bind', f'{host}:{port}',
                '--workers', '2',
                '--timeout', '120',
                '--keep-alive', '2',
                '--max-requests', '1000',
                '--max-requests-jitter', '100',
                '--preload',
                'server:app'
            ]
            wsgi.run()
        
    except Exception as e:
        logger.error(f"Failed to start application: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
