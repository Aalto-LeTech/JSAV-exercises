from glob import glob

files = glob('site/AV/*/*.html')

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

for ex in files:
  html += '<li><a href="'+ex+'">'+ex+'</a></li>\n'

html += '</ul><body></html>'

index_file = open('index.html','w')
index_file.write(html)
index_file.close()
