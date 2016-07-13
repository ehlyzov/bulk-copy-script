#!/usr/bin/env bash

# Script for preparation huge flat directory to uploading to SWIFT endpoint
#
set -o errexit   # exit on error
#set -o nounset   # exit on using an unsetted variable
#set -o xtrace    # enable debug
set -o pipefail  # exit on pipe error

usage() {
    cat <<EOF
Usage:
  split.sh [-b BATCH_SIZE] [-j NUMBER_OF_JOBS] <source_dir> <target_dir>

Options:
  -b BATCH_SIZE        maximum files in one archive (default: 50000)
  -j NUMBER_OF_JOBS    how many tar processes will be run simultaneously (default: 1)

Params:
  <source_dir>         source directory
  <target_dir>         directory where archive files will be created
EOF
}

# Defaults

# In case we need some paralleism in future
JOBS=1

# Set archive size
BATCH=50000

# We need this to configure xarg
ARG_MAX=$((`getconf ARG_MAX` - 4096))

while getopts "b:j:" Option; do
    case $Option in
        b ) BATCH="$OPTARG";;
        j ) JOBS="$OPTARG";;
        * ) echo "[!] Invalid option" && usage && exit 1;;
    esac
done

shift "$((OPTIND-1))"

if [[ -z "$1"  || -z "$2" ]]; then
    usage
    exit 1
fi

# helper for get abspath
canonical_readlink() {
    local filename
    cd `dirname "$1"`;
    filename=`basename "$1"`;
    if [ -h "$filename" ]; then
        canonical_readlink `readlink "$filename"`;
    else
        echo "`pwd -P`/$filename";
    fi
}

SRC=`canonical_readlink "$1"`
TARGET=`canonical_readlink "$2"`

if [ ! -d ${SRC} ]
then
   echo "Source directory doesn't exist: ${SRC}"
   exit 1
fi

if [ ! -d ${TARGET} ]
then
   echo "Target directory doesn't exist: ${TARGET}"
   exit 1
fi

echo "SOURCE: " ${SRC}
echo "TARGET: " ${TARGET}
echo "BATCH SIZE:" ${BATCH}
echo "JOBS:" ${JOBS}

echo "Make ${BATCH}-sized file listings"
find ${SRC} -name '*.txt' -print | awk -v target=${TARGET} -v batch=${BATCH} 'FNR%batch==1{if(FNR==1)c=0; close(out); out=target "/OUT"++c".txt";} {for (i=1; i<=NF; ++i) { sub(".*/", "", $i) } print > out}'
echo "Completed"

#echo "Start baking archives"
#find ${TARGET} -name 'OUT*.txt' -print | xargs -I FILE -P ${JOBS} -n1 tar -czf FILE.tar.gz -C ${SRC} -T FILE
#echo "Completed"
