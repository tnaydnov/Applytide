import sys
sys.path.append('/app')
from app.jobs.scraper import scrape_job

url = "https://careers.nike.com/he/retail-associate-pt-deer-park/job/R-65904"
try:
    result = scrape_job(url)
    print("SUCCESS:")
    print(result)
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
