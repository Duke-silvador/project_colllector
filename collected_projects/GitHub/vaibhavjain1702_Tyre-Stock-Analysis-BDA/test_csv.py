from pyspark.sql import SparkSession

# Initialize Spark session
spark = SparkSession.builder \
    .appName("SampleCSVAnalysis") \
    .master("spark://spark-master:7077") \
    .getOrCreate()

# Read CSV
df = spark.read.csv("/opt/bitnami/spark/data/sample.csv", header=True, inferSchema=True)

# Show schema and first 10 rows
df.printSchema()
df.show(10)

# Example transformation: count rows per category
df.groupBy("category").count().show()

# Stop Spark session
spark.stop()