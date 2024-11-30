
const Pet = require("../models/Pet");
const { sendEmail } = require('../utils/emailSender');

exports.getAllPets = (req, res) => {
  const showAll = req.user.userType === 'Admin';
  const searchTerm = req.query.searchTerm || '';
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.max(1, parseInt(req.query.pageSize) || 5);

  Pet.getAll(showAll, searchTerm, page, pageSize, (err, result) => {
      if (err) {
          console.error("Failed to retrieve pets:", err);
          return res.status(500).json({ error: "Internal server error" });
      }
      res.json(result);
  });
};

exports.getAllApprovedPets = (req, res) => {
  Pet.getAllApproved((err, pets) => {
      if (err) {
          console.error("Failed to retrieve approved pets:", err);
          return res.status(500).json({ error: "Internal server error" });
      }
      res.json(pets);
  });
};


exports.addPet = (req, res) => {
  const petData = {
    OwnerID: req.user.id, 
    Type: req.body.type,
    PetName: req.body.name,
    Species: req.body.species,
    Breed: req.body.breed,
    Markings: req.body.markings,
    Sex: req.body.sex,
    Birth: req.body.birth,
    Description: req.body.description,
    PetPhoto: req.files && req.files.petPhoto
      ? JSON.stringify(
          Array.isArray(req.files.petPhoto) 
            ? req.files.petPhoto.map(file => file.path.replace("uploads/", "")) 
            : [req.files.petPhoto.path.replace("uploads/", "")]
        )
      : null, 
    VaccinationCertificate: req.files && req.files.vaccinationCertificate
      ? JSON.stringify(
          Array.isArray(req.files.vaccinationCertificate) 
            ? req.files.vaccinationCertificate.map(file => file.path.replace("uploads/", ""))
            : [req.files.vaccinationCertificate.path.replace("uploads/", "")]
        )
      : null,
  };

  if (!petData.VaccinationCertificate) {
    return res.status(400).json({ error: "Vaccination Certificate is required." });
  }


  console.log("Received pet data:", petData);


  Pet.add(petData, (err, newId) => {
    if (err) {
      console.error("Error adding pet:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
    res.status(201).json({ message: "Pet added", PetID: newId });
  });
};


exports.getPetDetails = (req, res) => {
  const petId = req.params.id;
  Pet.findPetById(petId, (err, pet) => {
    if (err) {
      console.error("Error fetching pet:", err);
      return res
        .status(500)
        .json({ message: "Error fetching pet data", error: err });
    }
    if (!pet) {
      return res.status(404).json({ message: "Pet not found" });
    }

    try {
      pet.PetPhoto = pet.PetPhoto ? JSON.parse(pet.PetPhoto) : [];
    } catch (e) {
      console.error("Error parsing PetPhoto:", e);
      pet.PetPhoto = [];
    }

    try {
      pet.VaccinationCertificate = pet.VaccinationCertificate ? JSON.parse(pet.VaccinationCertificate) : [];
    } catch (e) {
      console.error("Error parsing VaccinationCertificate:", e);
      pet.VaccinationCertificate = [];
    }

    res.json(pet);
  });
};

exports.getLatestPets = (req, res) => {
  Pet.getLatest((err, pets) => {
    if (err) {
      console.error("Failed to retrieve latest pets:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
    res.json(pets);
  });
};


exports.getPetTypes = async (req, res) => {
  try {
    const petTypes = await Pet.getPetTypes();
    res.json(petTypes);
  } catch (error) {
    console.error('Error fetching pet types:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getPetsByType = async (req, res) => {
  const { type } = req.query;
  try {
    const pets = await Pet.getPetsByType(type);
    res.json(pets);
  } catch (error) {
    console.error('Error fetching pets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getPetsByOwnerID = (req, res) => {
  const ownerId = req.user.id;

  Pet.getPetsByOwnerID(ownerId, (err, pets) => {
    if (err) {
      console.error("Error fetching pets:", err);
      return res.status(500).json({ message: "Internal server error", error: err });
    }
    res.json(pets);
  });
};

exports.updatePet = (req, res) => {
  const petId = req.params.id;
  const updatedPet = req.body;
  
  if (req.file) {
    updatedPet.PetPhoto = req.file.path;
  }

 
  updatedPet.OwnerID = req.user.id;

  Pet.findPetById(petId, (err, pet) => {
    if (err || !pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }

    if (pet.OwnerID !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this pet' });
    }

    Pet.updatePet(petId, updatedPet, (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Internal server error', error: err });
      }
      res.json({ message: 'Pet updated successfully', result });
    });
  });
};

exports.deletePet = (req, res) => {
  const petId = req.params.id;

  Pet.deletePet(petId, (err, result) => {
      if (err) {
          console.error("Error deleting pet:", err);
          if (err.code === 'FOREIGN_KEY_CONSTRAINT') {
              return res.status(400).json({ message: err.message }); // Bad Request for foreign key constraint
          }
          return res.status(500).json({ message: "Internal server error", error: err.message }); // General error
      }
      res.json({ message: "Pet deleted successfully", result });
  });
};


exports.approvePet = (req, res) => {
  const { petId } = req.params;

  Pet.findPetById(petId, (err, pet) => {
      if (err || !pet) {
          return res.status(404).json({ error: "Pet not found" });
      }

      const ownerEmail = pet.ownerEmail;
      const petName = pet.PetName; // Assuming pet has a `name` field

      if (!ownerEmail) {
          return res.status(400).json({ error: "Owner email is not defined" });
      }

      Pet.setApproval(petId, true, async (err) => {
          if (err) {
              return res.status(500).json({ error: "Internal server error" });
          }

          try {
              const subject = 'Pet Approval Notification';
              const text = `Congratulations! Your pet, ${petName}, with ID ${petId} has been approved successfully.`;
              await sendEmail(ownerEmail, subject, text);

              res.json({ message: "Pet approved successfully and notification sent" });
          } catch (emailErr) {
              console.error('Error sending email:', emailErr);
              res.json({ message: "Pet approved successfully, but failed to send notification email" });
          }
      });
  });
};

exports.declinePet = (req, res) => {
  const { petId } = req.params;

  Pet.findPetById(petId, (err, pet) => {
      if (err || !pet) {
          return res.status(404).json({ error: "Pet not found" });
      }

      const ownerEmail = pet.ownerEmail;
      const petName = pet.PetName; // Assuming pet has a `name` field

      if (!ownerEmail) {
          return res.status(400).json({ error: "Owner email is not defined" });
      }

      Pet.setApproval(petId, false, async (err) => {
          if (err) {
              return res.status(500).json({ error: "Internal server error" });
          }

          try {
              const subject = 'Pet Application Declined';
              const text = `We regret to inform you that your pet, ${petName}, with ID ${petId} has been declined.`;
              await sendEmail(ownerEmail, subject, text);

              res.json({ message: "Pet declined successfully and notification sent" });
          } catch (emailErr) {
              console.error('Error sending email:', emailErr);
              res.json({ message: "Pet declined successfully, but failed to send notification email" });
          }
      });
  });
};
