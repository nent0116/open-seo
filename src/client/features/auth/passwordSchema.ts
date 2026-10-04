import { z } from "zod";
import {
  HOSTED_PASSWORD_MAX_LENGTH,
  HOSTED_PASSWORD_MIN_LENGTH,
} from "@/lib/auth-options";

export const passwordSchema = z
  .string()
  .min(
    HOSTED_PASSWORD_MIN_LENGTH,
    `パスワードは${HOSTED_PASSWORD_MIN_LENGTH}文字以上で入力してください。`,
  )
  .max(
    HOSTED_PASSWORD_MAX_LENGTH,
    `パスワードは${HOSTED_PASSWORD_MAX_LENGTH}文字以内で入力してください。`,
  );
