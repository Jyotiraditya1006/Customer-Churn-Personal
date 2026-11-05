import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import List, Tuple, Dict


class FocalLoss(nn.Module):
    """
    Focal Loss for addressing class imbalance in tabular churn prediction.
    Down-weights easy examples and focuses training on hard negatives.
    FL(pt) = -alpha_t * (1 - pt)^gamma * log(pt)
    """
    def __init__(self, alpha: float = 0.25, gamma: float = 2.0, reduction: str = "mean"):
        super().__init__()
        self.alpha = alpha
        self.gamma = gamma
        self.reduction = reduction

    def forward(self, inputs: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        bce_loss = F.binary_cross_entropy_with_logits(inputs, targets, reduction="none")
        pt = torch.exp(-bce_loss)
        alpha_t = self.alpha * targets + (1 - self.alpha) * (1 - targets)
        focal_loss = alpha_t * ((1 - pt) ** self.gamma) * bce_loss

        if self.reduction == "mean":
            return focal_loss.mean()
        elif self.reduction == "sum":
            return focal_loss.sum()
        return focal_loss


class ResidualBlock(nn.Module):
    """
    Residual feed-forward block with LayerNorm, GELU, and Dropout.
    Enables stable gradient flow through deep tabular architectures.
    """
    def __init__(self, dim: int, dropout: float = 0.2):
        super().__init__()
        self.block = nn.Sequential(
            nn.Linear(dim, dim),
            nn.LayerNorm(dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(dim, dim),
            nn.LayerNorm(dim),
            nn.Dropout(dropout)
        )
        self.activation = nn.GELU()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.activation(x + self.block(x))


class TabularResNet(nn.Module):
    """
    Deep Tabular ResNet with Entity Embeddings for high-performance Churn Prediction.
    
    Architecture:
    - Discrete features -> Learnable Entity Embedding Tables
    - Continuous features -> BatchNorm1d normalization
    - Concatenation -> Input projection -> Stacked Residual Blocks -> Head
    """
    def __init__(
        self,
        cat_cardinalities: List[int],
        num_continuous_features: int,
        embedding_dims: List[int] = None,
        hidden_dim: int = 128,
        num_blocks: int = 3,
        dropout: float = 0.2
    ):
        super().__init__()
        
        # Heuristic embedding dimension: min(50, (cardinality + 1) // 2) if not provided
        if embedding_dims is None:
            embedding_dims = [max(2, min(16, (c + 1) // 2)) for c in cat_cardinalities]
        
        self.cat_embeddings = nn.ModuleList([
            nn.Embedding(cardinality, emb_dim)
            for cardinality, emb_dim in zip(cat_cardinalities, embedding_dims)
        ])
        
        total_emb_dim = sum(embedding_dims)
        self.cont_norm = nn.BatchNorm1d(num_continuous_features)
        
        input_dim = total_emb_dim + num_continuous_features
        self.input_projection = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.GELU()
        )
        
        self.res_blocks = nn.ModuleList([
            ResidualBlock(hidden_dim, dropout=dropout) for _ in range(num_blocks)
        ])
        
        self.classifier_head = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.LayerNorm(hidden_dim // 2),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim // 2, 1)
        )

    def forward(self, x_cat: torch.Tensor, x_cont: torch.Tensor) -> torch.Tensor:
        """
        Forward pass returning unnormalized logits.
        x_cat: [BatchSize, NumCategoricalFeatures] (dtype torch.long)
        x_cont: [BatchSize, NumContinuousFeatures] (dtype torch.float32)
        """
        embedded = [
            emb_layer(x_cat[:, i])
            for i, emb_layer in enumerate(self.cat_embeddings)
        ]
        cat_repr = torch.cat(embedded, dim=1) if embedded else torch.empty((x_cat.size(0), 0), device=x_cat.device)
        
        if x_cont.size(1) > 0:
            cont_repr = self.cont_norm(x_cont)
            features = torch.cat([cat_repr, cont_repr], dim=1)
        else:
            features = cat_repr
            
        x = self.input_projection(features)
        for block in self.res_blocks:
            x = block(x)
            
        logits = self.classifier_head(x)
        return logits.squeeze(-1)

    def predict_proba(self, x_cat: torch.Tensor, x_cont: torch.Tensor) -> torch.Tensor:
        """Returns calibrated probability in range [0, 1]."""
        with torch.no_grad():
            logits = self.forward(x_cat, x_cont)
            return torch.sigmoid(logits)
