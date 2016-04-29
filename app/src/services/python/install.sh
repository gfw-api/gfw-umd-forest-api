BuildDep () {
  DST_FOLDER=`basename "$3"`
  echo "Building $DST_FOLDER..."
  if [ ! -d "$DST_FOLDER" ]; then
    # See: http://unix.stackexchange.com/a/84980
    TEMP_DIR=`mktemp -d 2>/dev/null || mktemp -d -t 'mytmpdir'`
    cd $TEMP_DIR
    git clone "$1" .
    git checkout "$2" .
    cd -
    mv "$TEMP_DIR/$3" ./
    rm -rf $TEMP_DIR
  fi
}

# Build oauth2client.
BuildDep https://github.com/google/oauth2client.git tags/v1.3.2 oauth2client

# Build the Earth Engine Python client library.
BuildDep https://github.com/google/earthengine-api.git v0.1.60 python/ee

# Build httplib2.
BuildDep https://github.com/jcgregorio/httplib2.git tags/v0.9.1 python2/httplib2
