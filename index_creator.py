from glob import glob

file_paths = glob('site/AV/*/*.html')

def get_exercise_name(file_path: str) -> str:
	""" Extracts the exercise name from the file path."""
	return file_path.split('/')[-1]

# Sort exercise file paths by exercise name
file_paths.sort(key=get_exercise_name)

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
	exercise_name = get_exercise_name(exercise_path)
	html += '<li><a href="'+exercise_path+'">'+exercise_name+'</a></li>\n'

html += '</ul><body></html>'

index_file = open('index.html','w')
index_file.write(html)
index_file.close()
