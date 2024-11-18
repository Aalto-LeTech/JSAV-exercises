void mergesort(int left, int right) { 
  int i, j, k, m;

  if (right > left) {
    m = (right + left) / 2;
    mergesort(left, m);
    mergesort(m + 1, right);

    for (i = m; i >= left; i--) 
      b[i]= a[i];
    for (j = m + 1; j <= right; j++)
      b[right + m + 1 - j] = a[j];
    
    i = left;
    j = right;
    for (k = left; k <= right; k++) 
      if (b[i] < b[j]) {
        a[k] = b[i];
        i = i + 1;
      } else {
        a[k] = b[j];
        j = j - 1;
      }
  }
}