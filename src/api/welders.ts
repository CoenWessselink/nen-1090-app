import client from "./client";

export const uploadWelderCertificate = (welderId: string, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return client.post(`/settings/welders/${welderId}/certificates`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
