from glob import glob

file_paths = glob('site/AV/*/*.html')

html = ('<html>\n'
	'<head>\n'
	'<style type="text/css">\n'
	'  h1, a {\n'
	'    font-family: Helvetica, arial, freesans, clean, sans-serif;\n'
	'  }\n'
	'  a:link, a:visited {\n'
	'    text-decoration:none;\n'
	'    color: #03d;\n'
	'  }\n'
	'  a:hover, a:active {\n'
	'    text-decoration:none;\n'
	'    color: #000;\n'
	'  }\n'
	'  ul {\n'
	'    list-style-type: circle;\n'
	'  }\n'
	'</style>\n'
	'</head>\n'
	'<body>\n'
	'<h1>JSAV Exercises</h1>\n'
	'<ul>\n')

for exercise_path in file_paths:
	exercise_name = exercise_path.split('/')[-1]
	html += '<li><a href="'+exercise_path+'">'+exercise_name+'</a></li>\n'

html += '</ul><body></html>'

index_file = open('index.html','w')
index_file.write(html)
index_file.close()
