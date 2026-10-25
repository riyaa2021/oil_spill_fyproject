import numpy as np
import cv2
from PIL import Image

def preprocess_image(image_rgb, target_size=256):
    """
    Preprocess image for model prediction
    
    Args:
        image_rgb: RGB image array
        target_size: Target size for resizing (default 256)
    
    Returns:
        img_batch: Batch ready for model, img_resized: Resized image
    """
    
    # Ensure image is RGB
    if len(image_rgb.shape) == 2:
        image_rgb = cv2.cvtColor(image_rgb, cv2.COLOR_GRAY2RGB)
    elif image_rgb.shape[2] == 4:
        image_rgb = cv2.cvtColor(image_rgb, cv2.COLOR_RGBA2RGB)
    
    # Resize to model input size
    img_resized = cv2.resize(image_rgb, (target_size, target_size), interpolation=cv2.INTER_LINEAR)
    
    # Ensure uint8
    if img_resized.dtype != np.uint8:
        img_resized = np.clip(img_resized, 0, 255).astype(np.uint8)
    
    # Normalize to [0, 1]
    img_normalized = img_resized.astype(np.float32) / 255.0
    
    # Ensure 3-channel RGB
    if len(img_normalized.shape) == 2:
        img_normalized = np.stack([img_normalized] * 3, axis=-1)
    elif img_normalized.shape[2] != 3:
        if img_normalized.shape[2] == 4:
            img_normalized = img_normalized[:, :, :3]
        else:
            img_normalized = np.stack([img_normalized[:, :, 0]] * 3, axis=-1)
    
    # Create batch (add batch dimension)
    img_batch = np.expand_dims(img_normalized, axis=0)
    
    return img_batch, img_resized


def postprocess_prediction(prediction, threshold=0.5):
    """
    Postprocess model prediction - FULLY CORRECTED FOR INVERTED PREDICTIONS
    
    ✅ CORRECTED: All values are now INVERTED (1.0 - prediction)
    This ensures:
    - HIGH prediction values (0.9) → LOW spill (0.1)
    - LOW prediction values (0.1) → HIGH spill (0.9)
    
    Args:
        prediction: Raw model output
        threshold: Threshold for binary mask (default 0.5)
    
    Returns:
        prob_map: Inverted probability heatmap, binary_mask: Binary segmentation
    """
    
    # Extract probability map
    prob_map = prediction[0, :, :, 0]
    
    # Clip to valid range [0, 1]
    prob_map = np.clip(prob_map, 0.0, 1.0)
    
    # ✅ FULLY INVERT: 1.0 - prediction
    # This ensures spill areas have HIGH values (close to 1.0)
    prob_map_inverted = 1.0 - prob_map
    
    # Apply threshold to create binary mask
    # HIGH values (inverted) = spill detected (1)
    # LOW values (inverted) = clean area (0)
    binary_mask = (prob_map_inverted > threshold).astype(np.uint8)
    
    return prob_map_inverted, binary_mask


def create_overlay(image, mask, alpha=0.5):
    """
    Create visualization overlay
    
    Args:
        image: Original image
        mask: Binary mask (1 = spill, 0 = clean)
        alpha: Transparency factor (0-1)
    
    Returns:
        overlay: Image with red overlay on spill areas
    """
    
    # Ensure image is uint8 [0, 255]
    if image.dtype != np.uint8:
        if image.max() <= 1.0:
            image = (image * 255).astype(np.uint8)
        else:
            image = np.clip(image, 0, 255).astype(np.uint8)
    
    # Ensure image is 3-channel RGB
    if len(image.shape) == 2:
        image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
    elif image.shape[2] == 4:
        image = cv2.cvtColor(image, cv2.COLOR_RGBA2RGB)
    
    # Create overlay
    overlay = image.copy().astype(np.float32)
    
    # Mark spill areas in RED (where mask = 1)
    overlay[mask > 0] = [255, 0, 0]
    
    # Blend original and overlay
    result = (1 - alpha) * image.astype(np.float32) + alpha * overlay
    result = np.clip(result, 0, 255).astype(np.uint8)
    
    return result


def calculate_spill_percentage(binary_mask):
    """
    Calculate spill coverage percentage
    
    ✅ CORRECTED: Spill pixels = where mask = 1
    
    Args:
        binary_mask: Binary segmentation mask (1 = spill, 0 = clean)
    
    Returns:
        percentage: Spill coverage percentage (0-100)
    """
    
    total_pixels = binary_mask.size
    spill_pixels = np.sum(binary_mask)  # Count pixels where mask = 1
    
    if total_pixels == 0:
        return 0.0
    
    percentage = (spill_pixels / total_pixels) * 100.0
    percentage = np.clip(percentage, 0.0, 100.0)
    
    return float(percentage)



def determine_risk_level(spill_percentage):
    """
    Classify oil-spill severity based on predicted spill coverage.

    Args:
        spill_percentage: Percentage of image pixels predicted as spill (0-100).

    Returns:
        Tuple containing the display message and UI status.
    """

    spill_percentage = float(spill_percentage)

    if spill_percentage < 1.0:
        return "LOW - No significant oil spill detected", "success"
    elif spill_percentage < 5.0:
        return "MEDIUM - Minimal oil spill detected", "info"
    elif spill_percentage < 15.0:
        return "HIGH - Moderate oil spill detected", "warning"
    else:
        return "CRITICAL - Severe oil spill detected", "danger"
