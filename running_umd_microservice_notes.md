# Global Forest Watch Microservices

These are notes for development and testing of the GFW app, particularly the
gfw-umd-forest-api app.

The production version of the microservice should be running at `https://production-api.globalforestwatch.org/umd-loss-gain`. E.g. the following should return country-level stats for Spain:

```
https://production-api.globalforestwatch.org/umd-loss-gain/admin/ESP?thresh=30
```

To run the gfw-umd app locally, you must download and run: 1) [control-tower](https://github.com/control-tower/control-tower), 2) [gfw-geostore-api](https://github.com/gfw-api/gfw-geostore-api),
3) [gfw-umd-forest-api](https://github.com/gfw-api/gfw-umd-forest-api).

Because the gfw-umd-forest-api requires the geostore microservice, control-tower
is needed to link the services together, and create a single access point. After
starting the services (by follow the instructions on the site repo), you will
need to register the umd app to control-tower. (*Note, in general, microservices
like geostore register automatically, but umd is an older service so will not.*)

The gfw-umd-forest-api will require a geostore object to work for testing, so one
must be created, as documented below.

## Register gfw-umd-forest-api with control tower

To view the currently registered microservices in control tower, you can send
a GET request to `localhost:9000/api/v1/microservice` with the Header information
Autorization and Content-Type. (Authorization value from the [control tower repo](https://github.com/control-tower/control-tower)). e.g.:

```
Authorization:
Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU4MjBhZDk0NjlhMDI4Nzk4MmY0Y2QxOCIsInByb3ZpZGVyIjoibG9jYWwiLCJwcm92aWRlcklkIjpudWxsLCJlbWFpbCI6InNlcmdpby5nb3JkaWxsb0B2aXp6dWFsaXR5LmNvbSIsInJvbGUiOiJBRE1JTiIsImNyZWF0ZWRBdCI6IjIwMTYtMTEtMDdUMTY6MzY6MzYuODY4WiIsImV4dHJhVXNlckRhdGEiOnsiYXBwcyI6WyJnZnciLCJwcmVwIiwiYXF1ZWR1Y3QiLCJmb3Jlc3QtYXRsYXMiLCJydyIsImRhdGE0c2RnIl19fQ.3GzuhG8wD4gI5Fo6NTqHC_Dq6ChKPPWXygga2mAuKZw

Content-Type:
application/json

```

The returned JSON contains a list of the valid endpoints. E.g.:

```json
"endpoints": [
      {
        "path": "/v1/geostore",
        "method": "POST",
        "redirect": {
          "method": "POST",
          "path": "/api/v1/geostore"
        }
      },
      {
        "path": "/v1/geostore/:id",
        "method": "GET",
        "redirect": {
          "method": "GET",
          "path": "/api/v1/geostore/:id"
        }
      },
      {
        "path": "/v1/geostore/admin/:iso",
        "method": "GET",
        "redirect": {
          "method": "GET",
          "path": "/api/v1/geostore/admin/:iso"
        }
      }]
```

Note, from the above, the `path` key is what the control-tower exposes, i.e.
the path you should connect to (.e.g. to access the final end-point in the above
list send a GET request to localhost:9000/v1/geostore/admin/<ISO>).

The gfw-umd-forest-api may not be added automatically to control tower,
to register it, you will need to send a POST request to `localhost:9000/api/v1/microservice`.


The BODY should contain raw content, where `mymachine` is your IP, the port is
the port where the app is running, (you will also need to include the earlier HEADER info too.).
```
{
    "name": "umd",
    "url": "http://mymachine:3600",
    "active": true
}
```

At this point the umd microservice should be registered.

### Geostore objects

Geostore is a micro-service that stores geojsons, and links them to unique hash id's.
The geojsons are sent to geostore via a post request, and stored in the system.
In global forest watch, as a user draws a polygon for analysis on global forest watch,
a geostore object is created. (The id is then sent to the gfw-umd app.)

#### Create a Geostore object:

To create a random geostore for testing you can head to [geojson.io](http://geojson.io).
Create a random polygon, and copy the resulting json. Send this to geostore in a POST
request, as raw BODY content. Note, we added a `{"geojson": }` wrapper.

```
{"geojson":{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[-29.70703125, -27.994401411046148],
                         [48.1640625, -27.994401411046148],
                         [48.1640625, 20.632784250388028],
                         [-29.70703125, 20.632784250388028],
                         [-29.70703125,  -27.994401411046148]]]
      }
    }
  ]
}}

```

The POST request also requires the previous authorization and content-type HEADERS.

### Access newly created geostore item

The response following the geostore post should looke like this:

```json
{
  "data": {
    "type": "geoStore",
    "id": "89c5c65e41986adc79c813b7e52ba5a8",
    "attributes": {
      "geojson": {
        "features": [
          {
            "type": "Feature",
            "geometry": {
              "type": "Polygon",
              "coordinates": [
                [
                  [
                    -29.70703125,
                    -27.994401411046148
                  ],
                  [
                    48.1640625,
                    -27.994401411046148
                  ],
                  [
                    48.1640625,
                    20.632784250388028
                  ],
                  [
                    -29.70703125,
                    20.632784250388028
                  ],
                  [
                    -29.70703125,
                    -27.994401411046148
                  ]
                ]
              ]
            }
          }
        ],
        "crs": {},
        "type": "FeatureCollection"
      },
      "hash": "89c5c65e41986adc79c813b7e52ba5a8",
      "provider": {},
      "areaHa": 4543469726.668918,
      "bbox": [
        -29.70703125,
        -27.994401411046148,
        48.1640625,
        20.632784250388028
      ],
      "lock": false
    }
  }
}

```

It contains a key called `hash`, which is a unique id in Geostore. This can be
used with get methods to return a json of the geostore object (without any authorization header), e.g.:

```html
localhost:9000/v1/geostore/89c5c65e41986adc79c813b7e52ba5a8
```

The production geostore objects can be accessed as below:

```html
https://production-api.globalforestwatch.org/geostore/c86b7294ffa03054fc438bfb67b1f846
```

We need to pass everything in a geostore object from `{features: *}` to the gfw-umd-forest-api microservice. Note, the geostore object contains
many useful values, including area in hectares (ha),
so it is not necessary to recalculate this in the umd service.


## USE the UMD microservice

Finally, now we have control-tower, with geostore and UMD, and an object in geostore,
we can access the UMD end-points.

Send a GET request using the hash ID, to the 'world' endpoint:

```html
localhost:9000/v1/umd-loss-gain/?geostore=c86b7294ffa03054fc438bfb67b1f846&thresh=10
```
If all is well, that should return JSON.

```json
{
  "data": {
    "type": "use",
    "id": "undefined",
    "attributes": {
      "loss": 541875791.05,
      "gain": 4201237.89,
      "treeExtent": 576962266.64,
      "areaHa": 4543469726.668918,
      "yearLoss": {
        "loss2001": 50404209.56,
        "loss2002": 43885409.28,
        "loss2003": 31988991.62,
        "loss2004": 30095394.66,
        "loss2005": 42093240.66,
        "loss2006": 37024625.49,
        "loss2007": 48575778.32,
        "loss2008": 42959201.75,
        "loss2009": 57316420.13,
        "loss2010": 56361623.52,
        "loss2011": 45458879,
        "loss2012": 55712017.06,
        "loss2013": 79475865.2,
        "loss2014": 103474216.31,
        "loss2015": 57497878.34
      }
    }
  }
}
```

Note, due to a quirk of the software architecture, current versions of the UMD
will fail if print statements are present in the Python code.
