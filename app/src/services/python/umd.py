import ee
import os
import json
import logging
import config
import sys

def _get_region(geom):
    """Return ee.Geometry from supplied GeoJSON object."""
    poly = _get_coords(geom)
    ptype = _get_type(geom)
    if ptype.lower() == 'multipolygon':
        region = ee.Geometry.MultiPolygon(poly)
    else:
        region = ee.Geometry.Polygon(poly)
    return region

def _get_coords(geojson):
    if geojson.get('features') is not None:
        return geojson.get('features')[0].get('geometry').get('coordinates')
    elif geojson.get('geometry') is not None:
        return geojson.get('geometry').get('coordinates')
    else:
        return geojson.get('coordinates')

def _get_type(geojson):
    if geojson.get('features') is not None:
        return geojson.get('features')[0].get('geometry').get('type')
    elif geojson.get('geometry') is not None:
        return geojson.get('geometry').get('type')
    else:
        return geojson.get('type')

def squaremeters_to_ha(value):
    """Converts square meters to hectares, and gives val to 2 decimal places"""
    #assert float(value),'Passed value {0} not a number'.format(value)
    tmp = value/10000.
    return float('{0:4.2f}'.format(tmp))

def ee_exec(threshold, geojson, asset_id, begin, end):
    """For a given threshold and geometry return a dictionary of ha area.
    The threshold is used to identify which band of loss and tree to select.
    asset_id should be 'projects/wri-datalab/HansenComposite_14-15'
    Methods used to identify data:

    Gain band is a binary (0 = 0, 255=1) of locations where tree cover increased
    over data collction period. Calculate area of gain, by converting 255 values
    to 1, and then using a trick to convert this to pixel area
    (1 * pixelArea()). Finally, we sum the areas over a given polygon using a
    reducer, and convert from square meters to hectares.

    Tree_X bands show percentage canopy cover of forest, If missing, no trees
    present. Therefore, to count the tree area of a given canopy cover, select
    the band, convert it to binary (0=no tree cover, 1 = tree cover), and
    identify pixel area via a trick, multiplying all 1 vals by image.pixelArea.
    Then, sum the values over a region. Finally, divide the result (meters
    squared) by 10,000 to convert to hectares
    """
    d = {}
    begin = int(begin.split('-')[0][2:])
    end = int(end.split('-')[0][2:])
    region = _get_region(geojson)
    reduce_args = {'reducer': ee.Reducer.sum().unweighted(),
                   'geometry': region,
                   'bestEffort': True,
                   'scale': 90}
    gfw_data = ee.Image(asset_id)
    loss_band = 'loss_{0}'.format(threshold)
    cover_band = 'tree_{0}'.format(threshold)
    # Identify 2000 forest cover at given threshold
    tree_area = gfw_data.select(cover_band).gt(0).multiply(
                    ee.Image.pixelArea()).reduceRegion(**reduce_args).getInfo()
    d['tree-extent'] = squaremeters_to_ha(tree_area[cover_band])
    # Identify tree gain over data collection period
    gain = gfw_data.select('gain').divide(255.0).multiply(
                    ee.Image.pixelArea()).reduceRegion(**reduce_args).getInfo()
    d['gain'] = squaremeters_to_ha(gain['gain'])
    # Identify area lost from begin year up untill end year
    tmp_img = gfw_data.select(loss_band)
    loss_area_img = tmp_img.gte(begin).And(tmp_img.lte(end)).multiply(ee.Image.pixelArea())
    loss_total = loss_area_img.reduceRegion(**reduce_args).getInfo()
    d['loss'] = squaremeters_to_ha(loss_total[loss_band])
    return d

def _execute_geojson(thresh, geojson, begin, end):
    """Query GEE using supplied args with threshold and geojson."""
    # Authenticate to GEE and maximize the deadline
    ee.Initialize(config.EE_CREDENTIALS, config.EE_URL)
    # ee.Initialize()
    ee.data.setDeadline(60000)
    geojson = json.loads(geojson)
    hansen_all = ee_exec(thresh,geojson,'projects/wri-datalab/HansenComposite_14-15', begin, end)
    return hansen_all

thresh = sys.argv[1]
geojsonPath = sys.argv[2]
begin = sys.argv[3]
end = sys.argv[4]

txt_file = open(geojsonPath)
print (json.dumps(_execute_geojson(thresh, txt_file.read(), begin, end)))
