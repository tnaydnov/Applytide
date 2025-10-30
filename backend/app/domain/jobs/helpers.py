"""
Job domain helper functions.

This module provides utility functions for job domain operations.
"""
from __future__ import annotations

import logging
from typing import List, Optional

logger = logging.getLogger(__name__)

# Configuration constants
MAX_DESCRIPTION_PARTS: int = 100  # Maximum number of description parts to prevent memory issues


def build_final_description(description: Optional[str]) -> Optional[str]:
    """
    Build a final job description by combining description parts.
    
    This function takes an optional description string and processes it
    into a final formatted description. Currently, it simply validates
    and returns the description, but can be extended to combine multiple
    parts or apply formatting.
    
    Args:
        description: Optional job description text. Can be None, empty,
                    or contain the description content.
    
    Returns:
        Optional[str]: The processed description string, or None if no
                      description was provided or it was empty after
                      processing.
    
    Examples:
        >>> build_final_description("Software Engineer position")
        'Software Engineer position'
        
        >>> build_final_description(None)
        None
        
        >>> build_final_description("")
        None
    
    Edge Cases:
        - None input: Returns None
        - Empty string: Returns None
        - Whitespace-only: Returns None (stripped and treated as empty)
        - Very long description: Logged as warning but processed
    
    Notes:
        - This function is designed to be extended for multi-part
          description building in the future
        - Currently validates single description input
        - Strips whitespace from description
    """
    try:
        parts: List[str] = []
        
        # Validate and process description
        if description:
            # Strip whitespace
            processed_desc = description.strip()
            
            if processed_desc:
                # Check for extremely long descriptions
                if len(processed_desc) > 50000:  # 50KB
                    logger.warning(
                        "Very long job description detected",
                        extra={
                            "description_length": len(processed_desc),
                            "max_recommended": 50000
                        }
                    )
                
                parts.append(processed_desc)
                logger.debug(
                    "Built job description",
                    extra={
                        "description_length": len(processed_desc),
                        "parts_count": len(parts)
                    }
                )
        
        # Validate parts count
        if len(parts) > MAX_DESCRIPTION_PARTS:
            logger.warning(
                "Description parts count exceeds maximum",
                extra={
                    "parts_count": len(parts),
                    "max_parts": MAX_DESCRIPTION_PARTS
                }
            )
            parts = parts[:MAX_DESCRIPTION_PARTS]
        
        # Join parts with newlines
        result = "\n".join(parts) if parts else None
        
        if result is None:
            logger.debug("No job description to build (input was empty or None)")
        
        return result
        
    except Exception as e:
        logger.error(
            "Error building job description",
            extra={
                "error": str(e),
                "error_type": type(e).__name__,
                "description_provided": description is not None
            },
            exc_info=True
        )
        # Return original description on error
        return description


# Export all functions
__all__ = ['build_final_description']
