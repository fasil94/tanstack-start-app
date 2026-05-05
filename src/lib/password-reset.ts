// import { createServerFn } from "@tanstack/react-start";
// import { z } from "zod";
// import { supabaseAdmin } from "@/integrations/supabase/client.server";

// const inputSchema = z.object({
//   email: z.string().email(),
//   otpId: z.string().uuid(),
//   password: z.string().min(8).max(72),
// });

// export const resetPasswordWithOtp = createServerFn({ method: "POST" })
//   .inputValidator((data: unknown) => inputSchema.parse(data))
//   .handler(async ({ data }) => {
//     const { email, otpId, password } = data;

//     const { data: otp, error: otpError } = await supabaseAdmin
//       .from("signup_otps")
//       .select("id, verified, expires_at, email, purpose")
//       .eq("id", otpId)
//       .maybeSingle();

//     if (otpError || !otp) {
//       throw new Error("Reset session not found. Please request a new code.");
//     }
//     if (otp.email !== email || otp.purpose !== "password_reset") {
//       throw new Error("Invalid reset session.");
//     }
//     if (!otp.verified) {
//       throw new Error("Code not verified. Please verify your code first.");
//     }
//     const ageMs = Date.now() - new Date(otp.expires_at).getTime();
//     if (ageMs > 30 * 60 * 1000) {
//       throw new Error("Reset session expired. Please request a new code.");
//     }

//     const { data: usersList, error: listError } =
//       await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
//     if (listError) {
//       throw new Error("Failed to look up account.");
//     }
//     const user = usersList.users.find(
//       (u) => u.email?.toLowerCase() === email.toLowerCase(),
//     );
//     if (!user) {
//       throw new Error("No account found for that email.");
//     }

//     const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
//       user.id,
//       { password },
//     );
//     if (updateError) {
//       throw new Error(updateError.message);
//     }

//     await supabaseAdmin.from("signup_otps").delete().eq("id", otpId);

//     return { ok: true };
//   });
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client"; // Admin ሳይሆን ተራውን client ተጠቀም

const inputSchema = z.object({
  email: z.string().email(),
  otpId: z.string(), // ይህ ከ URL የሚመጣው Token ነው
  password: z.string().min(8).max(72),
});

export const resetPasswordWithOtp = async ({ data }: { data: z.infer<typeof inputSchema> }) => {
  const { email, otpId, password } = inputSchema.parse(data);

  // 1. መጀመሪያ በሊንኩ የመጣውን OTP/Token ማረጋገጥ
  // ይህ ሲደረግ ዩዘሩ በጊዜያዊነት Login ይደረጋል
  const { error: verifyError } = await supabase.auth.verifyOtp({
    email,
    token: otpId,
    type: 'recovery', // ወይም 'magiclink' እንደ አሰፋፈሩ
  });

  if (verifyError) {
    throw new Error("ሊንኩ ጊዜው አልፎበታል ወይም ስህተት ነው: " + verifyError.message);
  }

  // 2. አሁን ዩዘሩ Verified ስለሆነ ፓስወርዱን መቀየር ይቻላል
  // ይህ 'SERVICE_ROLE_KEY' አይጠይቅም!
  const { error: updateError } = await supabase.auth.updateUser({
    password: password,
  });

  if (updateError) {
    throw new Error("ፓስወርዱን መቀየር አልተቻለም: " + updateError.message);
  }

  return { ok: true };
};
