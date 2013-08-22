from glob import glob

files = glob('0/exercises/jsav/*.html')

html = '<html><body>\n<ul>\n'
for ex in files:
  html += '<li><a href="'+ex+'">'+ex+'</a></li>\n'

html += '</ul><body></html>'

index_file = open('index.html','w')
index_file.write(html)
index_file.close()
