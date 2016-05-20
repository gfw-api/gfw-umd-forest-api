import ee
import os

EE_URL = 'https://earthengine.googleapis.com'
EE_ACCOUNT= '390573081381-lm51tabsc8q8b33ik497hc66qcmbj11d@developer.gserviceaccount.com'
EE_PRIVATE_KEY = os.environ["EE_PRIVATE_KEY"]

EE_CREDENTIALS = ee.ServiceAccountCredentials(EE_ACCOUNT, None, EE_PRIVATE_KEY)
