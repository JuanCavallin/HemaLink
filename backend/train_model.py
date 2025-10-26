import pandas as pd
import numpy as np
import fastapi
#from google.cloud import bigquery
import os
from sklearn.model_selection import train_test_split
#from sklearn import linear_model prefer classifier algorithm
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.gaussian_process import GaussianProcessClassifier
from sklearn.gaussian_process.kernels import RBF, ConstantKernel as C
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.metrics import (
    accuracy_score, precision_recall_fscore_support,
    confusion_matrix, roc_auc_score, classification_report
)
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
import joblib

#Diabetes Dataset from UCI ML Repo
from ucimlrepo import fetch_ucirepo

'''
Links to databases:
CDK:
https://archive.ics.uci.edu/dataset/336/chronic+kidney+disease
https://www.kaggle.com/datasets/mansoordaku/ckdisease 

'''

#TODO: install REACT and Next.js and get repo to work
#TODO: Extracted datasets into folder, but might want to use the API version to make the project look cool 
#TODO: check up on azure dataset I requested
#TODO: import dataset from online (for right now)
#TODO: finish writing code for machine learning 
#TODO: learn and set up FASTAPI 

def evaluate_model(fitted_pipeline, X_te, y_te, name):
    y_pred = fitted_pipeline.predict(X_te)

    # Try proba -> ROC-AUC; fall back to decision_function if needed
    auc = None
    if hasattr(fitted_pipeline, "predict_proba"):
        y_proba = fitted_pipeline.predict_proba(X_te)[:, 1]
        auc = roc_auc_score(y_te, y_proba)
    elif hasattr(fitted_pipeline, "decision_function"):
        y_score = fitted_pipeline.decision_function(X_te)
        auc = roc_auc_score(y_te, y_score)

    acc = accuracy_score(y_te, y_pred)
    prec, rec, f1, _ = precision_recall_fscore_support(
        y_te, y_pred, average="binary", zero_division=0
    )

    print(f"\n=== {name} ===")
    print(f"Accuracy:  {acc:.3f}")
    if auc is not None:
        print(f"ROC-AUC:   {auc:.3f}")
    print("Confusion matrix:\n", confusion_matrix(y_te, y_pred))
    print(classification_report(y_te, y_pred, digits=3))

def train_models(data, categorical_features, numerical_features):
    #Try random forest classifer, k-nearest, RBF SVM and Gaussian Process

    #Random Forest:
    rf_pre = ColumnTransformer(
        transformers=[
            # one-hot Gender; for binary it will drop one column automatically
            ("cat", OneHotEncoder(handle_unknown="ignore", drop="if_binary"), categorical_features),
            ("num", "passthrough", numerical_features),
        ]
    )
    
    rf_clf = RandomForestClassifier(
    n_estimators=400,
    max_depth=None,
    min_samples_split=2,
    min_samples_leaf=1,
    class_weight="balanced_subsample",  # helpful if class imbalance exists
    random_state=42
    )

    rf = Pipeline(steps=[("prep", rf_pre), ("clf", rf_clf)])
    
    gpc_pre = ColumnTransformer(
    transformers=[
        ("cat", OneHotEncoder(handle_unknown="ignore", drop="if_binary"), categorical_features),
        ("num", StandardScaler(), numerical_features),
    ]
    )

    kernel = C(1.0, (1e-2, 1e3)) * RBF(length_scale=1.0)
    gpc = Pipeline(steps=[
        ("prep", gpc_pre),
        ("clf", GaussianProcessClassifier(kernel=kernel, random_state=42, n_restarts_optimizer=1))
    ])
    
    knn_pre = ColumnTransformer(
    transformers=[
        ("cat", OneHotEncoder(handle_unknown="ignore", drop="if_binary"), categorical_features),
        ("num", StandardScaler(), numerical_features),
        ]
    )

    knn = Pipeline(steps=[
        ("prep", knn_pre),
        ("clf", KNeighborsClassifier(
            n_neighbors=7,       
            weights="distance",  
            metric="minkowski", p=2
        ))
    ])
    
    #SVM RBF
    svm_pre = ColumnTransformer(
    transformers=[
        ("cat", OneHotEncoder(handle_unknown="ignore", drop="if_binary"), categorical_features),
        ("num", StandardScaler(), numerical_features),
    ]
    )

    # Model step
    svm = Pipeline(steps=[
        ("prep", svm_pre),
        ("clf", SVC(kernel='rbf', C=1.0, gamma='scale', probability=True, random_state=42))
    ])
    models = {"Random Forest Classifier" : rf,
              "Gaussian Process Classifier" : gpc,
              "K-Nearest Neighbors" : knn,
              "RBF SVM" : svm
              }
    
    #Seperate data into random and training sets
    X = data.drop('Target', axis=1)
    y = data['Target']
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y) 
    '''
    random_forest_model = RandomForestClassifier(n_estimators=100, random_state=42)
    gaussian_process_model = GaussianProcessClassifier(kernel=RBF())
    knc_model = KNeighborsClassifier(n_neighbors=5)
    rbf_svm_model = SVC(kernel='rbf', gamma='scale')
    models = {"Random Forest": random_forest_model,
            "Gaussian Process": gaussian_process_model,
            "K-Nearest Neighbors": knc_model,
            "RBF SVM": rbf_svm_model 
            }
    '''
    
    for(name, model) in models.items():
        model.fit(X_train, y_train)
        #predictions = model.predict(X_test)
        #mse = metrics.mean_squared_error(y_test, predictions)
        print(f"Results for Model: {name}")
        evaluate_model(model, X_test, y_test, name)
        print("---------------")
        #model_output_path = os.path.join(output_str, 'trained_model.pkl')
    #pd.to_pickle(model, model_output_path)
    return model
    

def train_random_forest_classifier(data, categorical_features, numerical_features): 
    rf_pre = ColumnTransformer(
        transformers=[
            # one-hot Gender; for binary it will drop one column automatically
            ("cat", OneHotEncoder(handle_unknown="ignore", drop="if_binary"), categorical_features),
            ("num", "passthrough", numerical_features),
        ]
    )
    
    rf_clf = RandomForestClassifier(
    n_estimators=400,
    max_depth=None,
    min_samples_split=2,
    min_samples_leaf=1,
    class_weight="balanced_subsample",  # helpful if class imbalance exists
    random_state=42
    )
    X = data.drop('Target', axis=1)
    y = data['Target']
    rf = Pipeline(steps=[("prep", rf_pre), ("clf", rf_clf)])
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y) 
    rf.fit(X_train, y_train)
    evaluate_model(rf, X_test, y_test, "Random Forest Classifier")
    return rf


def main() -> None:
    
    #Train amenia dataset
    anemia_data = pd.read_csv("Datasets/anemia.csv")
    anemia_data.columns = ["Gender", "Hemoglobin", "MCH", "MCHC", "MCV", "Target"]
    anemia_rf = train_random_forest_classifier(anemia_data, categorical_features=["Gender"], numerical_features=["Hemoglobin", "MCH", "MCHC", "MCV"])
    joblib.dump(anemia_rf, 'ML_Models/anemia_rf_model.pkl')
    print(anemia_data)
    # Filter into two datasets: gender = 1 and gender = 0
    # Use boolean indexing (DataFrame.filter is for selecting columns, not rows)
    #male_anemia = anemia_data[anemia_data["Gender"] == 1].drop("Gender", axis=1)
    #print(male_anemia)
    #female_anemia = anemia_data[anemia_data["Gender"] == 0].drop("Gender", axis=1)
    #train_models(anemia_data, categorical_features=["Gender"], numerical_features=["Hemoglobin", "MCH", "MCHC", "MCV"])
    #So far, RF is the best for anemia dataset
    
    #Thyroid Database
    #columns = ["age", "sex", "TSH", "T3", "TT4", "T4U", "FTI", "TBG", "Target"]
    #thyroid_data = pd.read_csv("Datasets/thyroidDF.csv", usecols=range(len(columns)), names=columns)
    #train_models(thyroid_data, categorical_features=["sex"], numerical_features=["age", "TSH", "T3", "TT4", "T4U", "FTI", "TBG"])
    
    '''
    #Load up the diabetes dataset from UCI ML Repo
    obj = fetch_ucirepo(id=296) 
    data = obj['data']

    ids_df = data['ids'][['patient_nbr']].rename(columns={'patient_nbr': 'patient_id'})
    features_df = data['features']
    original_df = data['original']

    # Pick blood-indicator columns by name keywords (case-insensitive)
    blood_keywords = ('a1c', 'glu', 'glucose', 'serum')
    blood_cols = [c for c in features_df.columns
                if any(k in c.lower() for k in blood_keywords)]

    # Safety: ensure known columns are included if present
    for c in ('A1Cresult', 'max_glu_serum'):
        if c in features_df.columns and c not in blood_cols:
            blood_cols.append(c)

    # Build the final DataFrame
    diagnosis_df = original_df[['diag_1']].rename(columns={'diag_1': 'diagnosis'})

    result_df = pd.concat(
        [ids_df, features_df[blood_cols], diagnosis_df],
        axis=1
    )

    # Order columns: patient_id, blood indicators..., diagnosis
    result_df = result_df[['patient_id'] + blood_cols + ['diagnosis']]

    # Example peek
    print(result_df.head())

    # data (as pandas dataframes) 
    #X = diabetes_130_us_hospitals_for_years_1999_2008.data.features 
    #y = diabetes_130_us_hospitals_for_years_1999_2008.data.targets 
    
    # metadata 
    #print(diabetes_130_us_hospitals_for_years_1999_2008.metadata) 
    
    # variable information 
    #print(diabetes_130_us_hospitals_for_years_1999_2008.variables) 
    #print(diabetes_130_us_hospitals_for_years_1999_2008.data)

    '''
    
if __name__ == "__main__":
    main()