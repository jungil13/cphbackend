const Application = require('../models/applicationModel');
const transporter = require('../config/mailConfig');
const Pet = require('../models/Pet');

exports.submitApplication = (req, res) => {
    const applicationData = {
        UserID: req.user.id,  
        PetID: req.body.petId,
        PetExperience: req.body.petExperience,
        HomeEnvironment: req.body.homeEnvironment,
        OtherPets: req.body.otherPets,
        ChildrenAtHome: req.body.childrenAtHome,
        ReasonForAdoption: req.body.reasonForAdoption
    };

    Application.createApplication(applicationData, (error, result) => {
        if (error) {
            console.error("Error submitting application:", error);
            return res.status(500).json({ message: "Error submitting application", error });
        }
        res.status(201).json({ message: "Application submitted successfully", applicationId: result.insertId });
    });
};

exports.viewOwnerApplications = (req, res) => {
    const { ownerId } = req.params;
    Application.findByOwnerId(ownerId, (error, applications) => {
        if (error) {
            return res.status(500).json({ message: "Error retrieving applications", error });
        }
        if (applications.length === 0) {
            return res.status(404).json({ message: "No applications found for this owner" });
        }
        res.json({ applications });
    });
};

exports.updateApplicationStatus = (req, res) => {
    const { applicationId } = req.params;
    const { status } = req.body;

    // Update the application status
    Application.updateStatus(applicationId, status, (error) => {
        if (error) {
            console.error("Error updating application status:", error);
            return res.status(500).json({ message: "Error updating application status", error });
        }

        // Fetch application details to get the pet ID
        Application.getApplicationDetails(applicationId, (error, applicationDetails) => {
            if (error || !applicationDetails) {
                console.error("Error fetching application details:", error || "No application details found");
                return res.status(500).json({ message: "Error fetching application details" });
            }

            console.log("Application Details:", applicationDetails); // Log application details

            // Check if PetID is present
            const petId = applicationDetails.PetID; // Ensure PetID is accessed correctly
            if (!petId) {
                console.warn("Pet ID is missing in application details");
                return res.status(400).json({ message: "Pet ID is missing in application details" });
            }

            // If the application is approved, update the pet's status to "Adopted"
            if (status === 'approved') {
                Pet.updatePetStatus(petId, 'Adopted', (error) => {
                    if (error) {
                        console.error(`Error updating pet status for PetID ${petId}:`, error);
                        return res.status(500).json({ message: "Error updating pet status", error });
                    }
                    console.log(`Pet status updated to 'Adopted' for PetID: ${petId}`);
                });
            }

            // Prepare the email details
            let emailSubject = `Your application status for ${applicationDetails.petName} has been updated`;
            let emailText = `Hello ${applicationDetails.userName},\n\n`;

            if (status === 'declined') {
                emailSubject = `Your application for ${applicationDetails.petName} has been rejected`;
                emailText += `We're sorry to inform you that your application for ${applicationDetails.petName} has been rejected because your application doesn't meet the required requirements.\n\nThank you for your interest.`;
            } else {
                emailText += `Your application for ${applicationDetails.petName} has been ${status}.\n\n`
                    + `You can now contact the pet owner at:\nEmail: ${applicationDetails.ownerEmail}\n`
                    + `Contact Number: ${applicationDetails.ownerContactNumber}\n`
                    + `Address: ${applicationDetails.ownerAddress}\n\n`
                    + `Thank you for using our services!`;
            }

            const mailOptions = {
                from: 'yourEmail@gmail.com',
                to: applicationDetails.userEmail,
                subject: emailSubject,
                text: emailText
            };

            // Send the email
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error("Error sending email:", error);
                } else {
                    console.log('Email sent: ' + info.response);
                }
            });

            // Send a success response after all operations
            return res.json({ message: "Application status updated successfully" });
        });
    });
};

exports.getMyPetsApplications = (req, res) => {
    const userId = req.user.id;
    Application.getApplicationsByOwnerId(userId, (err, applications) => {
        if (err) {
            console.error('Error fetching applications:', err);
            return res.status(500).json({ message: 'Failed to fetch applications due to an internal error.', error: err });
        }
        if (applications.length === 0) {
            return res.status(404).json({ message: 'No applications found for your pets.' });
        }
        res.json({ applications });
    });
};
exports.getAllApplications = (req, res) => {
    const { page = 1, pageSize = 10, searchQuery = '' } = req.query;

    // Parse page and pageSize as integers
    const parsedPage = parseInt(page, 10);
    const parsedPageSize = parseInt(pageSize, 10);

    // Call the model function with pagination and search
    Application.getAllApplications(parsedPage, parsedPageSize, searchQuery, (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Error fetching applications', error: err.message });
        }

        const { applications, totalCount } = result;

        // Calculate total pages based on totalCount and pageSize
        const totalPages = Math.ceil(totalCount / parsedPageSize);

        // Send the applications and pagination info in the response
        res.status(200).json({
            applications,
            totalPages,
        });
    });
};

exports.deleteApplication = (req, res) => {
    const { applicationId } = req.params;

    Application.deleteApplication(applicationId, (error) => {
        if (error) {
            console.error("Error deleting application:", error);
            return res.status(500).json({ message: "Error deleting application", error });
        }
        res.json({ message: "Application deleted successfully" });
    });
};