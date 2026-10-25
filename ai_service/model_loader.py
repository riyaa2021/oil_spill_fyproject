import tensorflow as tf
import tensorflow.keras.backend as K
import warnings

warnings.filterwarnings("ignore")

@tf.keras.utils.register_keras_serializable(package="SpillGuard")
def dice_coefficient(y_true, y_pred, smooth=1e-6):
    """Calculate Dice Coefficient metric"""
    y_true_f = K.flatten(y_true)
    y_pred_f = K.flatten(y_pred)
    intersection = K.sum(y_true_f * y_pred_f)
    return (2. * intersection + smooth) / (K.sum(y_true_f) + K.sum(y_pred_f) + smooth)

@tf.keras.utils.register_keras_serializable(package="SpillGuard")
def iou_score(y_true, y_pred, threshold=0.5):
    """Calculate IoU (Intersection over Union) score"""
    y_pred_binary = tf.cast(y_pred > threshold, tf.float32)
    intersection = tf.reduce_sum(y_true * y_pred_binary)
    union = tf.reduce_sum(y_true) + tf.reduce_sum(y_pred_binary) - intersection
    return (intersection + K.epsilon()) / (union + K.epsilon())

CUSTOM_OBJECTS = {
    'dice_coefficient': dice_coefficient,
    'iou_score': iou_score,
}

def load_spillguard_model(model_path='AI_SpillGuard_v1_final_CORRECTED.keras'):
    """
    Load trained AI SpillGuard model
    
    Args:
        model_path: Path to model file
    
    Returns:
        Tuple of (model, loaded_successfully)
    """
    try:
        print(f"Loading model from: {model_path}")
        model = tf.keras.models.load_model(
            model_path,
            custom_objects=CUSTOM_OBJECTS,
            compile=False
        )
        
        # Print model info
        print(f"✅ Model loaded successfully!")
        print(f"   Input shape: {model.input_shape}")
        print(f"   Output shape: {model.output_shape}")
        
        return model, True
    
    except FileNotFoundError:
        print(f"❌ Model file not found: {model_path}")
        return None, False
    
    except Exception as e:
        print(f"❌ Failed to load model: {e}")
        import traceback
        traceback.print_exc()
        return None, False