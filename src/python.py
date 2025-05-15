import sys
import warnings
warnings.filterwarnings('ignore')  # Suppress all warnings

import numpy as np
import pandas as pd
from joblib import load
import os

# Get the directory containing this script
script_dir = os.path.dirname(os.path.abspath(__file__))

try:
    # Load the model using absolute path
    model = load(os.path.join(script_dir, 'model.joblib'))

    # Get command line arguments
    args = sys.argv[1:]
    
    if len(args) != 7:
        print("ERROR: Incorrect number of parameters")
        sys.exit(1)
        
    # Convert arguments to float and create input array
    try:
        input_data = np.array([float(x) for x in args]).reshape(1, -1)
    except ValueError:
        print("ERROR: Invalid parameter values")
        sys.exit(1)
        
    # Make prediction
    prediction = model.predict(input_data)
    
    # Map prediction to crop name
    crop_dict = {
        0: "Apple",
        1: "Banana",
        2: "Blackgram",
        3: "Chickpea",
        4: "Coconut",
        5: "Coffee",
        6: "Cotton",
        7: "Grapes",
        8: "Jute",
        9: "Kidneybeans",
        10: "Lentil",
        11: "Maize",
        12: "Mango",
        13: "Mothbeans",
        14: "Mungbean",
        15: "Muskmelon",
        16: "Orange",
        17: "Papaya",
        18: "Pigeonpeas",
        19: "Pomegranate",
        20: "Rice",
        21: "Watermelon"
    }
    
    result = crop_dict.get(prediction[0], "Unknown Crop")
    print(result)
    sys.stdout.flush()  # Ensure output is flushed

except Exception as e:
    print(f"ERROR: {str(e)}")
    sys.exit(1)