import apiClient from "@/lib/axios";

export interface ContactPayload {
  name: string;
  email: string;
  subject: string;
  message: string;
  website?: string; // honeypot — left empty by real users
}

export const contactService = {
  async send(payload: ContactPayload): Promise<void> {
    await apiClient.post("/api/v1/contact", payload);
  },
};
