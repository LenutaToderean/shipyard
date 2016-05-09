#!/usr/bin/env bash
SHIPYARD_HOST=$1
SHIPYARD_PORT=$2
SHIPYARD_NETWORK=$3

sudo docker run \
    --privileged \
    --net=${SHIPYARD_NETWORK} \
    -e SHIPYARD_HOST=${SHIPYARD_HOST}:${SHIPYARD_PORT} \
    --rm \
    -e http_proxy=$http_proxy \
    -e no_proxy=$no_proxy \
    -v /dev/shm:/dev/shm \
    -v $(pwd):/protractor \
    webnicer/protractor-headless conf.js
result=$?

exit $result