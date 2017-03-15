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
    assert float(value),'Passed value {0} not a number'.format(value)
    tmp = value/10000.
    return float('{0:4.2f}'.format(tmp))


# def _get_thresh_image(thresh, asset_id):
#     """Renames image bands using supplied threshold and returns image."""
#     image = ee.Image(asset_id)
#
#     # Select out the gain band if it exists
#     if 'gain' in asset_id:
#         before = image.select('.*_' + thresh, 'gain').bandNames()
#     else:
#         before = image.select('.*_' + thresh).bandNames()
#
#     after = before.map(
#         lambda x: ee.String(x).replace('_.*', ''))
#
#     image = image.select(before, after)
#     return image
#
#
# def _ee(geom, thresh, asset_id):
#     image = _get_thresh_image(thresh, asset_id)
#     region = _get_region(geom)
#
#     # Reducer arguments
#     reduce_args = {
#         'reducer': ee.Reducer.sum(),
#         'geometry': region,
#         'bestEffort': True,
#         'scale': 90
#     }
#
#     # Calculate stats
#     area_stats = image.divide(10000 * 255.0) \
#         .multiply(ee.Image.pixelArea()) \
#         .reduceRegion(**reduce_args)
#     area_results = area_stats.getInfo()
#
#     return area_results
#
#
# def _sum_range(data, begin, end):
#     return sum(
#         [value for key, value in data.iteritems()
#             if (int(key) >= int(begin)) and (int(key) < int(end))])


def ee_exec(threshold, geojson, asset_id):
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
    assert threshold in [10,15,20,25,30,50,75],'Bad threshold passed'
    d = {}
    region = _get_region(geojson)
    reduce_args = {'reducer': ee.Reducer.sum(),
                   'geometry': region,
                   'bestEffort': True,
                   'scale': 30}  # <--- Set scale here
    gfw_data = ee.Image(asset_id)
    loss_band = 'loss_{0}'.format(threshold)
    cover_band = 'tree_{0}'.format(threshold)
    tree_area = gfw_data.select(cover_band).gt(0).multiply(
                    ee.Image.pixelArea()).reduceRegion(**reduce_args).getInfo()
    d['tree_extent'] = squaremeters_to_ha(tree_area[cover_band])
    gain = gfw_data.select('gain').divide(255.0).multiply(
                ee.Image.pixelArea()).reduceRegion(**reduce_args).getInfo()
    d['gain'] = squaremeters_to_ha(gain['gain'])
    tmp_img = gfw_data.select(loss_band) # Iscolate loss band of given threshold
    for year in range(1,16):
        year_loss = tmp_img.updateMask(tmp_img.eq(year)).divide(year).multiply(
                    ee.Image.pixelArea()).reduceRegion(**reduce_args).getInfo()
        d['loss_{}'.format(year + 2000)] = squaremeters_to_ha(year_loss[loss_band])
    return d


def _execute_geojson(thresh, geojson, begin, end):
    """Query GEE using supplied args with threshold and geojson."""
    # Authenticate to GEE and maximize the deadline
    ee.Initialize(config.EE_CREDENTIALS, config.EE_URL)
    # ee.Initialize()
    ee.data.setDeadline(60000)
    geojson = json.loads(geojson)
    hansen_all = ee_exec(threshold=thresh, geojson=geojson,
                         asset_id='HANSEN/gfw2015_loss_tree_gain_threshold')
    # All the actual work has now been done. It is just a question of packaging
    # the data in a desireable way from here...
    # gain (UMD doesn't permit disaggregation of forest gain by threshold).
    gain = hansen_all['gain']
    logging.info('GAIN: %s' % gain)
    # tree extent in 2000
    tree_extent = hansen_all['tree']
    logging.info('TREE_EXTENT: %s' % tree_extent)

    # Loss by year
    loss_keys = ['loss_{0}'.format(n+2000) for n in range(1,16)]
    loss_by_year = {}
    for loss_key in loss_keys:
        loss_by_year[loss_key] = d[loss_key]
    #loss_by_year = _ee(geojson, thresh, 'HANSEN/gfw_loss_by_year_threshold_2015')
    logging.info('LOSS_RESULTS: %s' % loss_by_year)

    # Reduce loss by year for supplied begin and end year
    #begin = begin.split('-')[0]
    #end = end.split('-')[0]
    #loss = _sum_range(loss_by_year, begin, end)

    # Prepare result object
    result = {}
    # result['params'] = args
    # result['params']['geojson'] = json.loads(result['params']['geojson'])
    result['gain'] = gain
    result['loss'] = loss_by_year
    result['tree-extent'] = tree_extent

    return result



thresh = sys.argv[1]
geojsonPath = sys.argv[2]
begin = sys.argv[3]
end = sys.argv[4]


txt_file = open(geojsonPath)

print (json.dumps(_execute_geojson(thresh, txt_file.read(), begin, end)))
