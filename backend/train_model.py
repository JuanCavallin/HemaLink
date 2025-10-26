import pandas as pd
import numpy as np
import os
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer #theres better imputers but this one's fast
from sklearn.ensemble import RandomForestClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix, roc_auc_score, classification_report

from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
import joblib

#Diabetes Dataset from UCI ML Repo
from ucimlrepo import fetch_ucirepo


def evaluate_model(fitted_pipeline, X_te, y_te, name):
    y_pred = fitted_pipeline.predict(X_te)

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

    print(f"\n--- {name} ---")
    print(f"Accuracy:  {acc:.3f}")
    if auc is not None:
        print(f"ROC-AUC:   {auc:.3f}")
    print("Confusion matrix:\n", confusion_matrix(y_te, y_pred))
    print(classification_report(y_te, y_pred, digits=3))


def train_models(data, categorical_features, numerical_features):
    numeric_scaler_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])

    numeric_passthrough_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median'))
    ])

    categorical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='constant', fill_value='Missing')),
        ('onehot', OneHotEncoder(handle_unknown='ignore', drop='if_binary'))
    ])

    rf_preprocessor = ColumnTransformer(
        transformers=[
            ("cat", categorical_transformer, categorical_features),
            ("num", numeric_passthrough_transformer, numerical_features),
        ]
    )

    scaling_preprocessor = ColumnTransformer(
        transformers=[
            ("cat", categorical_transformer, categorical_features),
            ("num", numeric_scaler_transformer, numerical_features),
        ]
    )

    rf_clf = RandomForestClassifier(
        n_estimators=100,
        max_depth=None,
        min_samples_split=2,
        min_samples_leaf=1,
        class_weight="balanced_subsample",
        random_state=42,
        n_jobs=-1
    )
    rf = Pipeline(steps=[("prep", rf_preprocessor), ("clf", rf_clf)])

    knn = Pipeline(steps=[
        ("prep", scaling_preprocessor),
        ("clf", KNeighborsClassifier(
            n_neighbors=7,       
            weights="distance",  
            metric="minkowski", p=2,
            n_jobs=-1
        ))
    ])
    
    svm = Pipeline(steps=[
        ("prep", scaling_preprocessor),
        ("clf", SVC(kernel='rbf', C=1.0, gamma='scale', probability=True, random_state=42))
    ])

    models = {
        "Random Forest Classifier" : rf,
        "K-Nearest Neighbors" : knn,
    }
    
    X = data.drop('Target', axis=1)
    y = data['Target']
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    ) 
    
    print(f"Training on {len(X_train)} samples, testing on {len(X_test)} samples.")
    
    for(name, model) in models.items():
        try:
            print(f"--- Training {name} ---")
            model.fit(X_train, y_train)
            evaluate_model(model, X_test, y_test, name)
            print("-----------------")
        except Exception as e:
            print(f"!!! Failed to train {name}: {e} !!!")
            print("-----------------")

    return rf
    

def train_random_forest_classifier(data, categorical_features, numerical_features): 
    numeric_passthrough_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median'))
    ])

    categorical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='constant', fill_value='Missing')),
        ('onehot', OneHotEncoder(handle_unknown='ignore', drop='if_binary'))
    ])

    rf_preprocessor = ColumnTransformer(
        transformers=[
            ("cat", categorical_transformer, categorical_features),
            ("num", numeric_passthrough_transformer, numerical_features),
        ]
    )
    
    rf_clf = RandomForestClassifier(
        n_estimators=100,
        max_depth=None,
        min_samples_split=2,
        min_samples_leaf=1,
        class_weight="balanced_subsample",
        random_state=42,
        n_jobs=-1
    )
    
    rf_pipeline = Pipeline(steps=[("prep", rf_preprocessor), ("clf", rf_clf)])

    X = data.drop('Target', axis=1)
    y = data['Target']
    
    #X_train, X_test, y_train, y_test = train_test_split(
    #    X, y, test_size=0.2, random_state=42, stratify=y
    #) 

    #print(f"Training on {len(X_train)} samples, testing on {len(X_test)} samples.")
    
    try:
        name = "Random Forest Classifier"
        print(f"--- Training {name} ---")
        #rf_pipeline.fit(X_train, y_train)
        #Train with full data
        rf_pipeline.fit(X, y)
        #evaluate_model(rf_pipeline, X_test, y_test, name)
        evaluate_model(rf_pipeline, X, y, name)
        print("-----------------")
    except Exception as e:
        print(f"!!! Failed to train {name}: {e} !!!")
        print("-----------------")
    
    return rf_pipeline


def old_main() -> None:
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    datasets_dir = os.path.join(script_dir, "Datasets")
    anemia_file_path = os.path.join(datasets_dir, "anemia.csv")
    thyroid_file_path = os.path.join(datasets_dir, "thyroidDF.csv")

    output_dir = os.path.join(script_dir, "..", "ML_Models")
    os.makedirs(output_dir, exist_ok=True)

    print("\n\n---ANEMIA---")
    try:
        anemia_data = pd.read_csv(anemia_file_path)
        anemia_data.columns = ["Gender", "Hemoglobin", "MCH", "MCHC", "MCV", "Target"]
        
        print(f"Loaded Anemia data: {len(anemia_data)} rows.")
        
        categorical_features=[]
        numerical_features=["Gender", "Hemoglobin", "MCH", "MCHC", "MCV"]
        
        print(f"Using {len(numerical_features)} numerical features.")
        print(f"Using {len(categorical_features)} categorical features.")
        print(f"Target counts:\n{anemia_data['Target'].value_counts()}")

        anemia_rf = train_random_forest_classifier(
            anemia_data, 
            categorical_features=categorical_features, 
            numerical_features=numerical_features
        )
        
        anemia_model_path = os.path.join(output_dir, 'anemia_rf_model.pkl')
        joblib.dump(anemia_rf, anemia_model_path)
    
    except FileNotFoundError as e:
        print(f"!!! ERROR FOR ANEMIA: {e} !!!")
    except Exception as e:
        print(f"!!! ERROR FOR ANEMIA: {e} !!!")

    
    print("\n\n---THYROID---")
    try:
        columns = ["age", "sex", "TSH", "T3", "TT4", "T4U", "FTI", "TBG", "Target"]
        
        thyroid_data = pd.read_csv(
            thyroid_file_path, 
            na_values=["?"],
            usecols=columns
        )
        
        print(f"Loaded Thyroid data: {len(thyroid_data)} rows.")

        categorical_features=["sex"]
        numerical_features=["age", "TSH", "T3", "TT4", "T4U", "FTI", "TBG"]
        
        print(f"Using {len(numerical_features)} numerical features.")
        print(f"Using {len(categorical_features)} categorical features.")

        original_target_counts = thyroid_data['Target'].value_counts()
        print(f"Original Target counts:\n{original_target_counts}")
        
        thyroid_data['Target'] = thyroid_data['Target'].apply(lambda x: 0 if x == '-' else 1)
        
        print(f"Cleaned Target counts:\n{thyroid_data['Target'].value_counts()}")

        train_models(
            thyroid_data, 
            categorical_features=categorical_features, 
            numerical_features=numerical_features
        )
    
    except FileNotFoundError as e:
        print(f"!!! ERROR FOR THYROID: {e} !!!")
    except Exception as e:
        print(f"!!! ERROR FOR THYROID: {e} !!!")


    print("\n\n---DIABETES---")
    try:
        diabetes = fetch_ucirepo(id=296) 
        
        X = diabetes.data.features
        y = diabetes.data.targets
        
        data = pd.concat([X, y], axis=1)

        columns_to_drop = [
            'weight',
            'payer_code',
            'medical_specialty',
            'diag_1',
            'diag_2',
            'diag_3'
        ]
        
        data = data.drop(columns=columns_to_drop)
        numerical_features = [
            'time_in_hospital', 'num_lab_procedures', 'num_procedures', 
            'num_medications', 'number_outpatient', 'number_emergency', 
            'number_inpatient', 'number_diagnoses'
        ]
        categorical_features = [
            col for col in data.columns 
            if col not in numerical_features 
            and col not in ['readmitted', 'Target']
        ]
        
        print(f"Loaded Diabetes data: {len(data)} rows.")
        print(f"Using {len(numerical_features)} numerical features.")
        print(f"Using {len(categorical_features)} categorical features (after dropping problematic ones).")

        original_target_counts = data['readmitted'].value_counts()
        print(f"Original Target counts:\n{original_target_counts}")
        
        data['Target'] = data['readmitted'].apply(lambda x: 0 if x == 'NO' else 1)
        data = data.drop(columns=['readmitted'])
        
        print(f"Cleaned Target counts:\n{data['Target'].value_counts()}")

        train_models(
            data, 
            categorical_features=categorical_features, 
            numerical_features=numerical_features
        )
    
    except Exception as e:
        print(f"!!! ERROR FOR DIABETES: {e} !!!")

    
    print("\n\n---END---")

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    #THYROID DATA TRAINED!!!!!
    '''
    #Save Thyroid Model into folder
    thyroid_file_path = os.path.join(script_dir, "Datasets", "thyroidDF.csv")
    #thyroid_data = pd.read_csv(thyroid_file_path)

    #TODO: get new diabetes data
    columns = ["age", "sex", "TSH", "T3", "TT4", "T4U", "FTI", "TBG", "Target"]

    thyroid_data = pd.read_csv(
        thyroid_file_path, 
        na_values=["?"],
        usecols=columns
    )

    print(f"Loaded Thyroid data: {len(thyroid_data)} rows.")

    categorical_features=["sex"]
    numerical_features=["age", "TSH", "T3", "TT4", "T4U", "FTI", "TBG"]

    print(f"Using {len(numerical_features)} numerical features.")
    print(f"Using {len(categorical_features)} categorical features.")

    original_target_counts = thyroid_data['Target'].value_counts()
    print(f"Original Target counts:\n{original_target_counts}")

    thyroid_data['Target'] = thyroid_data['Target'].apply(lambda x: 0 if x == '-' else 1)

    print(f"Cleaned Target counts:\n{thyroid_data['Target'].value_counts()}")
    
    rf = train_random_forest_classifier(
        thyroid_data, 
        categorical_features=categorical_features, 
        numerical_features=numerical_features
    )
    
    output_dir = os.path.join(script_dir, "ML_Models")
    os.makedirs(output_dir, exist_ok=True)
    joblib.dump(rf, os.path.join(output_dir, 'thyroid_rf_model.pkl'))
    '''
    print("Running model training...")
    
    #Diabetes Dataset (from kaggle)
    diabetes_file_path_new = os.path.join(script_dir, "Datasets", "diabetes_data.csv")
    columns = [
    'Fasting_Blood_Glucose',
    'HbA1c',
    'Triglyceride_Levels',
    'LDL_Cholesterol',
    'HDL_Cholesterol',
    'CRP_Levels',
    'Insulin_Levels',
    'HOMA_IR',
    'OGTT',
    'Creatinine_Levels',
    'eGFR',
    'Uric_Acid_Levels',
    'Fructosamine_Levels',
    'ALT',
    'AST',
    'C_Peptide',
    'Proinsulin_Levels',
    'Target'
    ]
    diabetes_data_new = pd.read_csv(diabetes_file_path_new, usecols=columns)
    #Filter by relevant columns
    categorical_features = []
    numerical_features = columns[:-1]  # All except Target
    
    # Convert target values from 'Negative'/'Positive' to 0/1
    print(f"Original Target counts:\n{diabetes_data_new['Target'].value_counts()}")
    diabetes_data_new['Target'] = diabetes_data_new['Target'].apply(lambda x: 0 if x == 'Negative' else 1)
    print(f"Cleaned Target counts:\n{diabetes_data_new['Target'].value_counts()}")
    
    #Tested which model worked best for this dataset, winner is Random Forest Classifier
    '''
    train_models(
    diabetes_data_new, 
    categorical_features=categorical_features, 
    numerical_features=numerical_features
    )
    '''
    #Last step, save full fitted data into pickle file
    rf_diabetes = train_random_forest_classifier(
        diabetes_data_new, 
        categorical_features=categorical_features, 
        numerical_features=numerical_features
    )
    
    output_dir = os.path.join(script_dir, "ML_Models")
    os.makedirs(output_dir, exist_ok=True)
    joblib.dump(rf_diabetes, os.path.join(output_dir, 'diabetes_rf_model.pkl'))
if __name__ == "__main__":
    main()