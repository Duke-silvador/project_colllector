"""
Builds report.html with embedded charts.
"""

import json
import base64


# Load results JSON
with open("outputs/results.json", "r") as file:
    r = json.load(file)


# Embed images into HTML
img = lambda file_name, caption: (
    f'<figure>'
    f'<img src="data:image/png;base64,'
    f'{base64.b64encode(open("outputs/"+file_name,"rb").read()).decode()}">'
    f'<figcaption>{caption}</figcaption>'
    f'</figure>'
)


# Create HTML tables
tbl = lambda rows: (
    "<div class=w><table><tr>"
    + "".join(f"<th>{k}</th>" for k in rows[0])
    + "</tr>"
    + "".join(
        "<tr>"
        + "".join(f"<td>{v}</td>" for v in x.values())
        + "</tr>"
        for x in rows
    )
    + "</table></div>"
)


c = r["cleaning"]


html = f"""
<!DOCTYPE html>
<html lang="en">

<head>

<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">

<title>
OTT User Segmentation and Recommendation Analysis
</title>


<style>

body {{
background:#f7f6f2;
font-family:Arial;
margin:20px;
color:#1b2a41;
}}

main {{
max-width:980px;
margin:auto;
}}

h1,h2 {{
font-family:Georgia;
}}

h2 {{
color:#d9661f;
border-bottom:1px solid #ddd;
padding-bottom:5px;
}}

.k {{
display:grid;
grid-template-columns:repeat(auto-fit,minmax(150px,1fr));
gap:12px;
}}

.k div {{
background:white;
padding:15px;
border-radius:10px;
border:1px solid #ddd;
}}

.k b {{
font-size:26px;
color:#d9661f;
display:block;
}}

figure {{
background:white;
padding:10px;
border-radius:10px;
border:1px solid #ddd;
}}

img {{
max-width:100%;
}}

table {{
border-collapse:collapse;
width:100%;
background:white;
}}

th,td {{
border:1px solid #ddd;
padding:8px;
}}

th {{
background:#d9661f;
color:white;
}}

</style>

</head>


<body>

<main>


<p style="color:#d9661f;font-weight:bold;">
DSML MINI PROJECT
</p>


<h1>
OTT User Segmentation and Recommendation Analysis Using Machine Learning
</h1>


<p>
Python, Pandas, NumPy, Matplotlib, Seaborn and Scikit-learn.
Users are grouped using K-Means and DBSCAN,
then personalized content and subscription recommendations are generated.
</p>



<div class=k>

<div>
<b>{c['Rows After Cleaning']}</b>
users after cleaning
</div>

<div>
<b>8</b>
features used
</div>

<div>
<b>4</b>
segments (K-Means)
</div>

<div>
<b>{r['model_comparison'][0]['Silhouette']}</b>
silhouette score
</div>

</div>



<h2>
1. Workflow
</h2>


<pre>

OTT User Dataset
        |
Data Preprocessing
        |
EDA
        |
Feature Scaling
        |
K-Means + DBSCAN
        |
Cluster Evaluation
        |
User Segmentation
        |
Recommendation

</pre>



<h2>
2. Data Preprocessing
</h2>


<p>

{c['Rows Before Cleaning']} raw rows.
Removed {c['Duplicate Rows']} duplicates.

Missing values:
Age {c['Missing Values'].get('Age',0)},
WatchTime {c['Missing Values'].get('WatchTime',0)},
AvgRating {c['Missing Values'].get('AvgRating',0)}

were filled using median.

Subscription Type encoded as:
Basic = 0,
Standard = 1,
Premium = 2.

</p>



<h2>
3. Exploratory Data Analysis
</h2>


{img(
"eda_overview.png",
"Watch time, genres, subscription, engagement, movies vs series, devices"
)}


{img(
"correlation_heatmap.png",
"Feature correlation heatmap"
)}



<h2>
4. Choosing K for K-Means
</h2>


{img(
"elbow_silhouette.png",
"Elbow Method and Silhouette Score"
)}



<h2>
5. K-Means vs DBSCAN
</h2>


{img(
"kmeans_pca.png",
"K-Means segments using PCA"
)}


{img(
"dbscan_pca.png",
"DBSCAN clusters"
)}


{tbl(r['model_comparison'])}



<h2>
6. User Segments
</h2>


{img(
"cluster_profiles.png",
"Cluster profiles"
)}


{tbl(r['cluster_profile'])}



{img(
"segment_summary.png",
"Segment summary"
)}



<h2>
7. Recommendations
</h2>


{tbl(r['recommendations'])}



<h2>
8. Conclusion
</h2>


<p>

K-Means with 4 clusters successfully created meaningful OTT user segments.
These segments help OTT platforms provide personalized recommendations,
improve customer retention and optimize subscription plans.

</p>


</main>

</body>

</html>
"""


# Save report

with open(
    "report.html",
    "w",
    encoding="utf8"
) as file:
    file.write(html)


print(
    len(html)//1024,
    "KB"
)