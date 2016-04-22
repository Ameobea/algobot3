# Script to process a CSV produced by a data_downloader.  It removes duplicates, sorts, and splits
# into chunks as well as creating an index before copying the results to the tick_data directory.
# Syntax: ./process.sh in.csv
if [ -z $1 ]
  then
  echo "Syntax: ./process.sh in.csv"
else
  echo "Sorting $1..."
  sort -u -n $1 > /tmp/sorted.csv; #Removes duplicate lines and sorts by timestamp

  PAIR=`echo $1 | awk '{ n=split($0,x,"/"); split(x[n],y,".csv"); print(toupper(y[1])) }'`

  echo "Chunking sorted file and saving results to tick_data directory..."
  python chunker.py -p $PAIR -i /tmp/sorted.csv -o ../tick_data/

  echo "Done!"
fi
