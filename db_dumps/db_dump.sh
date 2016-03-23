# param 1: path to output dir
# param 2: name of algobot database
echo $1
echo $2
mongodump -d $2 -o $1
