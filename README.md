# GFW UMD Forest API

This repository holds the microservice that it implement the umd funcionality and exposed the /umd-loss-gain endpoint in control tower

[View the documentation for this
API](http://gfw-api.github.io/swagger-ui/?url=https://raw.githubusercontent.com/gfw-api/gfw-umd-forest-api/master/app/microservice/swagger.yml#/UMD)

## First time user
Perform the following steps:
* [Install docker](https://docs.docker.com/engine/installation/)
* [Install control tower](https://github.com/control-tower/control-tower)
* Clone this repository: ```git clone git@github.com:gfw-api/gfw-umd-forest-api.git```
* Enter in the directory ```cd gfw-umd-forest-api```
* Rename and update the .env.example --> .env and add the carto account and PEM code
* Open a terminal and run:

```bash
    sh ./umdForest.sh develop

```

## Install in heroku

Is necessary define the next environment variables:
* API_GATEWAY_URI => Url the register of the API Gateway. Remember: If the authentication is active in API Gateway, add the username and password in the url
* NODE_ENV => Environment (prod, staging, dev)
* CARTODB_APIKEY => API key to connect to CartoDB
* CARTODB_USER => User to connect to CartoDB

Is necessary the pem file of Google Earth Engine authentication in the root of the project



# Config

## register.json
This file contain the configuration about the endpoints that public the microservice. This json will send to the apigateway. it can contain variables:
* #(service.id) => Id of the service setted in the config file by environment
* #(service.name) => Name of the service setted in the config file by environment
* #(service.uri) => Base uri of the service setted in the config file by environment

Example:
````
{
    "id": "#(service.id)",
    "name": "#(service.name)",
    "urls": [{
        "url": "/story",
        "method": "POST",
        "endpoints": [{
            "method": "POST",
            "baseUrl": "#(service.uri)",
            "path": "/api/v1/story",
            "data": ["loggedUser"]
        }]
    }, {
        "url": "/story/:id",
        "method": "GET",
        "endpoints": [{
            "method": "GET",
            "baseUrl": "#(service.uri)",
            "path": "/api/v1/story/:id"
        }]
    }, {
        "url": "/user",
        "method": "GET",
        "endpoints": [{
            "method": "GET",
            "baseUrl": "#(service.uri)",
            "path": "/api/v1/story"
        }]
    }]
}


```
