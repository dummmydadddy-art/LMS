# research/runtime/__init__.py
from research.runtime.resource_manager import ResourceManager, GLOBAL_RESOURCE_MANAGER
from research.runtime.page_budget import PageBudgetManager

__all__ = [
    "ResourceManager",
    "GLOBAL_RESOURCE_MANAGER",
    "PageBudgetManager"
]
