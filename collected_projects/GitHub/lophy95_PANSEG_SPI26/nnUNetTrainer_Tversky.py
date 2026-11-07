from nnunetv2.training.nnUNetTrainer.nnUNetTrainer import nnUNetTrainer
from nnunetv2.training.loss.dice import MemoryEfficientSoftDiceLoss
from nnunetv2.training.loss.robust_ce_loss import RobustCrossEntropyLoss
from nnunetv2.training.loss.deep_supervision import DeepSupervisionWrapper
from nnunetv2.utilities.helpers import softmax_helper_dim1
import torch
import torch.nn as nn
import numpy as np


class TverskyLoss(nn.Module):
    """Generalises Dice by weighting false positives (alpha) against false
    negatives (beta) separately. alpha > beta penalises FP more heavily.

    Reference: Salehi et al., 'Tversky loss function for image segmentation
    using 3D fully convolutional deep networks', MLMI 2017.
    """

    def __init__(self, alpha=0.7, beta=0.3, smooth=1e-5):
        super().__init__()
        self.alpha = alpha
        self.beta = beta
        self.smooth = smooth

    def forward(self, net_output, target):
        net_output = softmax_helper_dim1(net_output)
        y_onehot = torch.zeros_like(net_output)
        y_onehot.scatter_(1, target.long(), 1)
        dims = tuple(range(2, net_output.ndim))
        tp = (net_output * y_onehot).sum(dim=dims)
        fp = (net_output * (1 - y_onehot)).sum(dim=dims)
        fn = ((1 - net_output) * y_onehot).sum(dim=dims)
        tversky = (tp + self.smooth) / (
            tp + self.alpha * fp + self.beta * fn + self.smooth
        )
        return 1 - tversky.mean()


class DiceCETverskyLoss(nn.Module):
    """Baseline Dice + CE, plus a Tversky term."""

    def __init__(self, batch_dice=True, ddp=False, lambda_tversky=0.3,
                 alpha=0.7, beta=0.3):
        super().__init__()
        self.dice = MemoryEfficientSoftDiceLoss(
            apply_nonlin=softmax_helper_dim1, batch_dice=batch_dice,
            do_bg=False, smooth=1e-5, ddp=ddp
        )
        self.ce = RobustCrossEntropyLoss()
        self.tversky = TverskyLoss(alpha=alpha, beta=beta)
        self.lambda_tversky = lambda_tversky

    def forward(self, net_output, target):
        loss = self.dice(net_output, target) + self.ce(net_output, target[:, 0].long())
        loss = loss + self.lambda_tversky * self.tversky(net_output, target)
        return loss


class nnUNetTrainer_Tversky(nnUNetTrainer):
    """Same schedule as the 2 mm baseline run (2000 epochs, lr 1e-3),
    with an added Tversky term. alpha > beta penalises false positives."""

    ALPHA = 0.7
    BETA = 0.3
    LAMBDA_TVERSKY = 0.3

    def __init__(self, plans: dict, configuration: str, fold: int,
                 dataset_json: dict, unpack_dataset: bool = True,
                 device: torch.device = torch.device('cuda')):
        super().__init__(plans, configuration, fold, dataset_json,
                         unpack_dataset, device)
        self.num_epochs = 2000
        self.initial_lr = 1e-3

    def _build_loss(self):
        loss = DiceCETverskyLoss(
            batch_dice=self.configuration_manager.batch_dice,
            ddp=self.is_ddp,
            lambda_tversky=self.LAMBDA_TVERSKY,
            alpha=self.ALPHA,
            beta=self.BETA,
        )

        if True:
            deep_supervision_scales = self._get_deep_supervision_scales()
            weights = np.array([1 / (2 ** i) for i in range(len(deep_supervision_scales))])
            if self.is_ddp and not self._do_i_compile():
                weights[-1] = 1e-6
            else:
                weights[-1] = 0
            weights = weights / weights.sum()
            loss = DeepSupervisionWrapper(loss, weights)

        return loss


class nnUNetTrainer_TverskyFN(nnUNetTrainer_Tversky):
    """Opposite direction: alpha < beta, so false NEGATIVES are penalised more.
    This is the variant consistent with partial labelling -- a predicted lesion
    outside the annotation may be a real unannotated metastasis rather than an
    error, so it should cost less than missing an annotated lesion."""

    ALPHA = 0.3
    BETA = 0.7
