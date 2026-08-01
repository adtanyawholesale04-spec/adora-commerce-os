"use server";

import { revalidatePath } from "next/cache";
import {
  createManualPaymentReviewService,
  type ManualPaymentReviewActionResult,
  type ManualPaymentReviewActionState,
} from "@/lib/admin/manual-payment-review";

const reviewService = createManualPaymentReviewService();

export async function verifyManualPaymentAction(
  _previousState: ManualPaymentReviewActionState,
  formData: FormData,
): Promise<ManualPaymentReviewActionResult> {
  const result = await reviewService.verifyReview(actionInput(formData));
  revalidateReviewOnSuccess(result);
  return result;
}

export async function rejectManualPaymentAction(
  _previousState: ManualPaymentReviewActionState,
  formData: FormData,
): Promise<ManualPaymentReviewActionResult> {
  const result = await reviewService.rejectReview(actionInput(formData));
  revalidateReviewOnSuccess(result);
  return result;
}

function actionInput(formData: FormData) {
  return {
    paymentTransactionId: String(
      formData.get("paymentTransactionId") ?? "",
    ),
    expectedStatus: String(formData.get("expectedStatus") ?? ""),
    reason: String(formData.get("reason") ?? ""),
    requestId: String(formData.get("requestId") ?? ""),
  };
}

function revalidateReviewOnSuccess(result: ManualPaymentReviewActionResult) {
  if (!result.ok) return;
  revalidatePath("/admin/payments");
  revalidatePath("/admin/payments/review");
  revalidatePath(`/admin/payments/review/${result.paymentTransactionId}`);
}
