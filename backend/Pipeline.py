from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer

# For the _RemainderColsList issue, mock it
class _RemainderColsList:
    pass

import sklearn.compose._column_transformer
sklearn.compose._column_transformer._RemainderColsList = _RemainderColsList
import numpy as np
dtype = np.dtype

