def merge_sort(S): 
    """Sort the elements of list S"""
    n = len(S)
    if n < 2:
        return
    mid = n // 2
    S1 = S[0:mid]
    S2 = S[mid:n]
    merge_sort(S1)
    merge_sort(S2)
    merge(S1, S2, S)


def merge(S1, S2, S):
    """Merge two sorted lists S1 and S2 into list S"""
    i = j = 0
    while i + j < len(S): 
        if j == len(S2) or (i < len(S1) and S1[i] < S2[j]):
            # Copy ith element of S1
            S[i+j] = S1[i]
            i += 1    
        else:
            # Copy jth element of S2
            S[i+j] = S2[j]
            j += 1