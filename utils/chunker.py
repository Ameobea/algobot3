import os, sys, getopt

#FORMAT: python chunker.py -p pair -s chunkSize -i inputFile -o outputDirectory
#EXAMPLE: python chunker.py -p USDCAD -s chunkSize -i ../data_downloaders/fxcm/output/usdcad.csv -o ./

def main(argv):
  output_directory = "./"
  input_filename = ""
  chunk_size = 50000
  pair = "EURUSD"

  try:
    opts, args = getopt.getopt(argv,"p:s:i:o:", ["pair=", "chunksize=", "in=", "out="])
  except getopt.GetoptError:
    print 'python chunker.py -p pair -s chunkSize -i inputFile -o outputDirectory'
    sys.exit(2)

  for opt, arg in opts:
    if opt == "-h":
      print 'python chunker.py -p pair -s chunkSize -i inputFile -o outputDirectory'
    elif opt in ("-i", "--in"):
      input_filename = os.path.join(os.path.dirname(__file__), arg)
    elif opt in ("-o", "--out"):
      output_directory = os.path.join(os.path.dirname(__file__), arg)
    elif opt in ("-s", "--chunksize"):
      chunk_size = arg
    elif opt in ("-p", "--pair"):
      pair = arg

  if input_filename == "":
    print 'python chunker.py -p pair -s chunkSize -i inputFile -o outputDirectory'
    sys.exit(2)

  # pair = sys.argv[0]
  # chunk_size = 50000 #size of chunked files in lines

  input_file = open(input_filename, "r")

  if os.path.isdir(output_directory + pair):
    print output_directory + pair + " already exists!"
    sys.exit(2)
  os.mkdir(output_directory + pair)
  i = 0 #current progress in output file
  l = 0 #current output chunk number
  line = input_file.readline() #Read header line out of input csv
  output_file = open(output_directory + pair + "/" + pair + "_" + str(l) + ".csv", "w+") #create and first output file
  output_file.write(line) #write header line into first output file
  index_file = open(output_directory + pair + "/index.csv", "w+") #create and index csv
  index_file.write("block,start,end\n") #write header of input csv

  line = input_file.readline() #read first data line out of input csv
  index_file.write(str(l) + "," + line.split(",")[0] + ",")
  while line:
    if(i > chunk_size): #if current output file full:
      i = 0 #reset output progress
      l += 1 #increment chunk number
      index_file.write(oldline.split(",")[0] + "\n") #finish previous index line with last line in chunk
      index_file.write(str(l) + "," + line.split(",")[0] + ",") #start next line of index with first line of new block
      output_file.close()
      output_file = open("/var/algobot3/tick_data/" + pair + "/" + pair + "_" + str(l) + ".csv", "w+") #create and open new output file after closing the old one.
      output_file.write("timestamp,ask,bid\n") #add header line to the new output file
    output_file.write(line) #write data line into output file
    i += 1
    oldline = line #save copy of last line in case we have to index it
    line = input_file.readline() #read next line
  output_file.write(oldline.split(",")[0])

if __name__ == "__main__":
  main(sys.argv[1:])
