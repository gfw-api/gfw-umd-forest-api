import ee
import os

EE_URL = 'https://earthengine.googleapis.com'
EE_ACCOUNT= '390573081381-lm51tabsc8q8b33ik497hc66qcmbj11d@developer.gserviceaccount.com'
# EE_PRIVATE_KEY = "Bag Attributes\n    friendlyName: privatekey\n    localKeyID: 54 69 6D 65 20 31 34 33 31 33 33 35 35 32 33 35 30 38\nKey Attributes: <No Attributes>\n-----BEGIN RSA PRIVATE KEY-----\nMIICXgIBAAKBgQCUwqlC9GIgWzqe4m4uA+SlJgZSAHeYDJiwQQc/fJPyse8aXmHm\nue+0Fn19gHgFnAdKuYPkPuOX4WPLH7V8KJahls0p1t3YKlqL10yyUsokp0N6MoNS\n8jLVqJn2RgfwDxbB5ZCx+fx8l6XDQGyEtjvig+uy+wnvAUuJxoMD23SFQQIDAQAB\nAoGAZ9CRnxA9iqcf+dG7YpGE91vZ/VAmJg5kYFyBWmTuOujCHHzRhdss1Vj8qqEF\nIaUJ0bQ1vwvEeTHqGs8+MC+DLqFSrUISGnsYHjSU8iqrhjOK7RXI7jTQNwEJw5y/\nYKHSZ1fOcc9mhWkuRStgnYQ8fIQNA//pCq7YOcG64wPBeAECQQDFIXOoyqNCm4le\nUNZ3Sif2gLFRxlCRRotJVCsSTqnbejIiSYLP1OaFJzIYoGeO6ScT5z4O9/WTJrXa\nnw1zNQGRAkEAwS9TA2eLWAlhPiv1Szxdxqa/6wxsprJ1tgE2JFkPNOSmGFND9D07\ncRdcfIf0pX+YpDiIu0coLgyZYnu8Ya9wsQJBALQBq9+ByjrUVEevgWdEa+GH+mM1\nt/QwepfnJ71731bu6kCs56poOmd0NyaNsoKpHGnsSprYiYJpYr3TZzDAQkECQQCF\nApNyfaFoXRTyHIwIYCjk9LyhFm3cnHUFenIPtq4Mqf1eND5OdLZvmDkamPUt2dt7\n/lzOLSESC6S0NSOwUn4RAkEAnTPbbU9El90Uw4w18Ij4n5yTLc6UZx7kP2tG7rlJ\np6YilMqKUX+ypyI+MO0BwWaNBMzkSighu/ke+OrDEdWxrg==\n-----END RSA PRIVATE KEY-----"

EE_PRIVATE_KEY = os.environ["EE_PRIVATE_KEY"]

EE_CREDENTIALS = ee.ServiceAccountCredentials(EE_ACCOUNT, None, EE_PRIVATE_KEY)
