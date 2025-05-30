import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

router.post("/", async (req, res) => {
  const { email, phoneNumber } = req.body;

  if (!email && !phoneNumber) {
    return res.status(400).json({ error: "email or phoneNumber required" });
  }

  try {
    // Find all contacts where email or phoneNumber matches and deletedAt is null
    const contacts = await prisma.contact.findMany({
      where: {
        deletedAt: null,
        OR: [
          { email: email || undefined },
          { phoneNumber: phoneNumber || undefined },
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    if (contacts.length === 0) {
      // No existing contact - create a new primary contact
      const newContact = await prisma.contact.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: "primary",
        },
      });

      return res.json({
        contact: {
          primaryContactId: newContact.id,
          emails: email ? [email] : [],
          phoneNumbers: phoneNumber ? [phoneNumber] : [],
          secondaryContactIds: [],
        },
      });
    }

    // Find the oldest contact - this will be the primary contact
    let primaryContact = contacts.find((c) => c.linkPrecedence === "primary");
    if (!primaryContact) {
      // If none marked primary, choose oldest as primary and update others
      primaryContact = contacts[0];
      await prisma.contact.updateMany({
        where: {
          OR: contacts.map((c) => ({ id: c.id })),
          id: { not: primaryContact.id },
        },
        data: {
          linkPrecedence: "secondary",
          linkedId: primaryContact.id,
        },
      });
      await prisma.contact.update({
        where: { id: primaryContact.id },
        data: { linkPrecedence: "primary", linkedId: null },
      });
    }

    // Collect all linked contacts related to the primary contact
    const linkedContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { id: primaryContact.id },
          { linkedId: primaryContact.id },
        ],
        deletedAt: null,
      },
      orderBy: { createdAt: "asc" },
    });

    // Check if incoming email or phoneNumber already exists among linked contacts
    const emailExists = email ? linkedContacts.some(c => c.email === email) : false;
    const phoneExists = phoneNumber ? linkedContacts.some(c => c.phoneNumber === phoneNumber) : false;

    // If either email or phoneNumber is new, create a secondary contact
    if ((!emailExists && email) || (!phoneExists && phoneNumber)) {
      const newSecondaryContact = await prisma.contact.create({
        data: {
          email: emailExists ? null : email,
          phoneNumber: phoneExists ? null : phoneNumber,
          linkedId: primaryContact.id,
          linkPrecedence: "secondary",
        },
      });

      linkedContacts.push(newSecondaryContact);
    }

    // Collect unique emails and phoneNumbers
    const emailsSet = new Set<string>();
    const phoneNumbersSet = new Set<string>();
    const secondaryContactIds: number[] = [];

    for (const c of linkedContacts) {
      if (c.email) emailsSet.add(c.email);
      if (c.phoneNumber) phoneNumbersSet.add(c.phoneNumber);
      if (c.linkPrecedence === "secondary") secondaryContactIds.push(c.id);
    }

    return res.json({
      contact: {
        primaryContactId: primaryContact.id,
        emails: [primaryContact.email, ...Array.from(emailsSet).filter(e => e !== primaryContact.email)].filter(Boolean),
        phoneNumbers: [primaryContact.phoneNumber, ...Array.from(phoneNumbersSet).filter(p => p !== primaryContact.phoneNumber)].filter(Boolean),
        secondaryContactIds,
      },
    });

  } catch (error) {
    console.error("Identify error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
