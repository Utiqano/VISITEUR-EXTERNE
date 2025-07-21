// Restrict past dates for visitor form
function restrictPastDates() {
    const dateInput = document.getElementById('visiteur_date');
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);
}

// Escape CSV fields to handle special characters
function escapeCSVField(field) {
    if (!field) return '';
    return `"${field.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
}

// Update notification bubbles for RH, Direction, and Security
function updateNotificationBubbles() {
    // RH: Count pending_rh forms
    db.collection('visitors').where('status', '==', 'pending_rh').get()
        .then((querySnapshot) => {
            const rhBubble = document.getElementById('rhNotification');
            const count = querySnapshot.size;
            rhBubble.textContent = count;
            rhBubble.classList.toggle('hidden', count === 0);
        })
        .catch((error) => {
            console.error('Error updating RH notification:', error);
        });

    // Direction: Count pending_direction forms
    db.collection('visitors').where('status', '==', 'pending_direction').get()
        .then((querySnapshot) => {
            const dirBubble = document.getElementById('directionNotification');
            const count = querySnapshot.size;
            dirBubble.textContent = count;
            dirBubble.classList.toggle('hidden', count === 0);
        })
        .catch((error) => {
            console.error('Error updating Direction notification:', error);
        });

    // Security: Count approved or rejected forms
    db.collection('visitors').where('status', 'in', ['approved', 'rejected']).get()
        .then((querySnapshot) => {
            const secBubble = document.getElementById('securityNotification');
            const count = querySnapshot.size;
            secBubble.textContent = count;
            secBubble.classList.toggle('hidden', count === 0);
        })
        .catch((error) => {
            console.error('Error updating Security notification:', error);
        });
}

// Submit visitor form
function submitForm(event) {
    event.preventDefault();
    const formData = new FormData(document.getElementById('visitorForm'));
    const data = Object.fromEntries(formData);
    const visiteurDate = new Date(data.visiteur_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (visiteurDate < today) {
        alert('Erreur : La date de la visite doit être aujourd\'hui ou une date future.');
        return;
    }
    data.status = 'pending_rh';
    data.id = Date.now();
    data.timestamp = firebase.firestore.FieldValue.serverTimestamp();

    console.log('Submitting form with data:', data);
    db.collection('visitors').doc(data.id.toString()).set(data)
        .then(() => {
            console.log('Form submitted to Firestore with ID:', data.id);
            document.getElementById('visitorForm').reset();
            alert('Formulaire envoyé à RH pour validation.');
            updateRHList();
            updateNotificationBubbles();
            showSection('rh');
        })
        .catch((error) => {
            console.error('Error submitting form:', error);
            alert('Erreur lors de l\'envoi du formulaire: ' + error.message);
        });
}

// Show security data table
function showSecurityDataTable() {
    const dataTableSection = document.getElementById('securityDataTable');
    const dataToggle = document.getElementById('securityDataToggle');
    dataTableSection.classList.toggle('active');
    if (dataTableSection.classList.contains('active')) {
        dataToggle.textContent = 'Masquer Data';
        db.collection('visitors').get()
            .then((querySnapshot) => {
                console.log('Security data table forms count:', querySnapshot.size);
                const tableBody = document.getElementById('securityDataTableBody');
                tableBody.innerHTML = '';
                querySnapshot.forEach((doc) => {
                    const form = doc.data();
                    const row = document.createElement('tr');
                    let statutFinal = form.status;
                    if (statutFinal === 'pending_rh') statutFinal = 'En attente RH';
                    else if (statutFinal === 'pending_direction') statutFinal = 'En attente Direction';
                    else if (statutFinal === 'pending_security') statutFinal = 'En attente Sécurité';
                    else if (statutFinal === 'approved') statutFinal = 'Approuvé';
                    else if (statutFinal === 'rejected') statutFinal = 'Refusé';
                    else if (statutFinal === 'archived') statutFinal = 'Archivé';
                    row.innerHTML = `
                        <td data-label="Visiteur">${form.visiteur_nom || 'N/A'}</td>
                        <td data-label="Date">${form.visiteur_date || 'N/A'}</td>
                        <td data-label="Demandeur">${form.demandeur_nom || 'N/A'}</td>
                        <td data-label="Entreprise">${form.visiteur_entreprise || 'N/A'}</td>
                        <td data-label="Heure d’arrivée prévue">${form.visiteur_heure || 'N/A'}</td>
                        <td data-label="Statut Final" class="${form.status}">${statutFinal}</td>
                    `;
                    tableBody.appendChild(row);
                });
            })
            .catch((error) => {
                console.error('Error fetching security data table:', error);
                alert('Erreur lors de la récupération des données: ' + error.message);
            });
    } else {
        dataToggle.textContent = 'Data';
    }
}

// Show specific section
function showSection(section) {
    console.log('showSection called with:', section, 'loggedInRole:', window.loggedInRole);
    if (section !== 'visitor' && !window.loggedInRole) {
        showLogin(section);
        return;
    }
    if (section !== 'visitor' && window.loggedInRole !== section) {
        alert('Accès non autorisé pour ce rôle.');
        return;
    }
    document.querySelectorAll('.content > div').forEach(div => div.classList.remove('active'));
    document.getElementById(section).classList.add('active');
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('active');
    }
    console.log('Showing section:', section, 'Current role:', window.loggedInRole);
}

// Show login form for specific role
function showLogin(role) {
    console.log('showLogin called with:', role);
    window.currentSection = role;
    document.querySelectorAll('.content > div').forEach(div => div.classList.remove('active'));
    document.getElementById('login').classList.add('active');
    const emailInput = document.getElementById('email');
    if (role === 'rh') emailInput.value = 'Bedis.Sghair@wkw-group.com';
    else if (role === 'direction') emailInput.value = 'Abdelkader.Klai@wkw-group.com';
    else if (role === 'security') emailInput.value = 'Labib.Troudi@wkw-group.com';
    document.getElementById('password').value = '';
    emailInput.focus();
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('active');
    }
}

// Handle login
function handleLogin(event) {
    event.preventDefault();
    console.log('handleLogin triggered');
    const email = document.getElementById('email').value.toLowerCase();
    const password = document.getElementById('password').value;
    const error = document.getElementById('error');

    if (!window.auth) {
        error.textContent = 'Firebase authentication not initialized. Check console.';
        console.error('Firebase auth is undefined');
        return;
    }

    console.log('Attempting login with email:', email, 'password:', password);
    window.auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log('Login successful for:', email, 'User UID:', userCredential.user.uid);
            const user = userCredential.user;
            let role;
            if (email === 'bedis.sghair@wkw-group.com') role = 'rh';
            else if (email === 'abdelkader.klai@wkw-group.com') role = 'direction';
            else if (email === 'labib.troudi@wkw-group.com') role = 'security';
            else {
                window.auth.signOut();
                throw new Error('Rôle non autorisé pour cet email.');
            }
            window.loggedInRole = role;
            console.log('Assigned role:', window.loggedInRole);

            return db.collection('users').doc(email).set({ role: role }, { merge: true })
                .then(() => {
                    console.log('Role synced to Firestore for:', email);
                    error.textContent = '';
                    document.getElementById('loginForm').reset();
                    showSection(window.currentSection || window.loggedInRole);
                    setupRealTimeListeners();
                    updateNotificationBubbles();
                });
        })
        .catch((error) => {
            console.error('Login error:', error.code, error.message);
            error.textContent = `Erreur: ${error.message}`;
        });
}

// Validate RH form
function validateRH(id) {
    if (window.loggedInRole !== 'rh') {
        alert('Accès non autorisé pour valider.');
        return;
    }
    const rhDecision = document.querySelector(`input[name="rh_${id}"]:checked`).value;
    const rhName = document.getElementById(`rh_name_${id}`).value;
    const rhSignature = document.getElementById(`rh_signature_${id}`).value;
    if (!rhName || !rhSignature) {
        alert('Veuillez remplir le nom et la signature.');
        return;
    }

    const updateData = {
        rh_decision: rhDecision,
        rh_name: rhName,
        rh_signature: rhSignature,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (rhDecision === 'rejected') {
        updateData.status = 'rejected';
        updateData.final_status = 'Refusé';
    } else if (rhDecision === 'approved') {
        updateData.status = 'pending_direction';
    }

    db.collection('visitors').doc(id.toString()).update(updateData)
        .then(() => {
            console.log('RH validation updated in Firestore for ID:', id, 'New status:', updateData.status);
            updateRHList();
            updateNotificationBubbles();
            if (rhDecision === 'approved') {
                updateDirectionList();
                setTimeout(() => {
                    alert('Demande validée par RH, envoyée à Direction.');
                    showSection('direction');
                }, 500);
            } else if (rhDecision === 'rejected') {
                setTimeout(() => {
                    alert('Demande refusée par RH.');
                    showSection('security');
                }, 500);
            }
        })
        .catch((error) => {
            console.error('Error updating RH validation:', error);
            alert('Erreur lors de la validation RH: ' + error.message);
        });
}

// Validate Direction form
function validateDirection(id) {
    if (window.loggedInRole !== 'direction') {
        alert('Accès non autorisé pour valider.');
        return;
    }
    const dirDecision = document.querySelector(`input[name="dir_${id}"]:checked`)?.value || 'approved';
    const dirName = document.getElementById(`dir_name_${id}`).value;
    const dirSignature = document.getElementById(`dir_signature_${id}`).value;
    if (!dirName || !dirSignature) {
        alert('Veuillez remplir le nom et la signature.');
        return;
    }

    const updateData = {
        dir_decision: dirDecision,
        dir_name: dirName,
        dir_signature: dirSignature,
        status: dirDecision === 'approved' ? 'approved' : 'rejected',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    db.collection('visitors').doc(id.toString()).update(updateData)
        .then(() => {
            console.log('Direction validation updated in Firestore for ID:', id, 'New status:', updateData.status);
            return db.collection('visitors').doc(id.toString()).get().then(doc => {
                console.log('Verified document after update:', doc.data());
                updateDirectionList();
                updateNotificationBubbles();
                setTimeout(() => {
                    alert(`Demande ${dirDecision === 'approved' ? 'validée' : 'refusée'} par Direction.`);
                    showSection('security');
                }, 500);
            });
        })
        .catch((error) => {
            console.error('Error updating Direction validation:', error);
            alert('Erreur lors de la validation Direction: ' + error.message);
        });
}

// Update RH list
function updateRHList() {
    console.log('Updating RH list...');
    db.collection('visitors').where('status', '==', 'pending_rh').get()
        .then((querySnapshot) => {
            console.log('RH forms count:', querySnapshot.size);
            const rhList = document.getElementById('rhFormList');
            rhList.innerHTML = '';
            querySnapshot.forEach((doc) => {
                const form = doc.data();
                const div = document.createElement('div');
                div.classList.add('validation-section');
                div.innerHTML = `
                    <p><strong>Demandeur :</strong> ${form.demandeur_nom || 'N/A'}</p>
                    <p><strong>Visiteur :</strong> ${form.visiteur_nom || 'N/A'}</p>
                    <p><strong>Motif :</strong> ${form.visiteur_motif || 'N/A'}</p>
                    <p><strong>Date :</strong> ${form.visiteur_date || 'N/A'}</p>
                    <p><strong>Entreprise / Organisation :</strong> ${form.visiteur_entreprise || 'N/A'}</p>
                    <div class="approved"><label><input type="radio" name="rh_${form.id}" value="approved" required> Accordé</label></div>
                    <div class="rejected"><label><input type="radio" name="rh_${form.id}" value="rejected"> Refusé</label></div>
                    <br>
                    <label>Nom :</label><input type="text" id="rh_name_${form.id}" required>
                    <label>Signature :</label><input type="text" id="rh_signature_${form.id}" required>
                    <button data-id="${form.id}" onclick="validateRH(${form.id})">Valider</button>
                `;
                rhList.appendChild(div);
            });
        })
        .catch((error) => {
            console.error('Error fetching RH list:', error);
        });
}

// Update RH archive
function updateRHArchive() {
    console.log('Updating RH archive...');
    db.collection('visitors').get()
        .then((querySnapshot) => {
            const rhArchiveList = document.getElementById('rhArchiveList');
            rhArchiveList.innerHTML = '';
            querySnapshot.forEach((doc) => {
                const form = doc.data();
                if (form.status !== 'pending_rh') {
                    const div = document.createElement('div');
                    div.classList.add('validation-section');
                    div.innerHTML = `
                        <p><strong>Demandeur :</strong> ${form.demandeur_nom || 'N/A'}</p>
                        <p><strong>Visiteur :</strong> ${form.visiteur_nom || 'N/A'}</p>
                        <p><strong>Motif :</strong> ${form.visiteur_motif || 'N/A'}</p>
                        <p><strong>Date :</strong> ${form.visiteur_date || 'N/A'}</p>
                        <p><strong>Entreprise / Organisation :</strong> ${form.visiteur_entreprise || 'N/A'}</p>
                        ${form.rh_name ? `<p><strong>Décision RH :</strong> ${form.rh_decision === 'approved' ? 'Accordé' : 'Refusé'} par ${form.rh_name}</p>` : '<p><strong>Décision RH :</strong> En attente</p>'}
                        ${form.rh_name ? `<p><strong>Nom :</strong> ${form.rh_name}</p>` : ''}
                        ${form.rh_signature ? `<p><strong>Signature :</strong> ${form.rh_signature}</p>` : ''}
                        ${form.final_status ? `<p><strong>Statut Final :</strong> ${form.final_status}</p>` : ''}
                    `;
                    rhArchiveList.appendChild(div);
                }
            });
            console.log('RH archive updated, forms count:', querySnapshot.size);
        })
        .catch((error) => {
            console.error('Error fetching RH archive:', error);
            alert('Erreur lors de la récupération de l\'archive RH: ' + error.message);
        });
}

// Toggle RH archive
function toggleRHArchive() {
    const archiveSection = document.getElementById('rhArchiveSection');
    const archiveToggle = document.getElementById('rhArchiveToggle');
    const isActive = archiveSection.classList.toggle('active');
    archiveToggle.textContent = isActive ? 'Masquer' : 'Afficher';
    if (isActive) {
        updateRHArchive();
    }
    console.log('RH archive toggled:', isActive ? 'Shown' : 'Hidden');
}

// Update Direction list
function updateDirectionList() {
    console.log('Updating Direction list...');
    db.collection('visitors').where('status', '==', 'pending_direction').get()
        .then((querySnapshot) => {
            console.log('Direction forms count:', querySnapshot.size);
            const directionList = document.getElementById('directionFormList');
            directionList.innerHTML = '';
            querySnapshot.forEach((doc) => {
                const form = doc.data();
                const div = document.createElement('div');
                div.classList.add('validation-section');
                div.innerHTML = `
                    <p><strong>Demandeur :</strong> ${form.demandeur_nom || 'N/A'}</p>
                    <p><strong>Visiteur :</strong> ${form.visiteur_nom || 'N/A'}</p>
                    <p><strong>Motif :</strong> ${form.visiteur_motif || 'N/A'}</p>
                    <p><strong>Date :</strong> ${form.visiteur_date || 'N/A'}</p>
                    <p><strong>Entreprise / Organisation :</strong> ${form.visiteur_entreprise || 'N/A'}</p>
                    <p><strong>RH Validation :</strong> ${form.rh_name || 'N/A'}</p>
                    <div class="approved"><label><input type="radio" name="dir_${form.id}" value="approved" required> Accordé</label></div>
                    <div class="rejected"><label><input type="radio" name="dir_${form.id}" value="rejected"> Refusé</label></div>
                    <br>
                    <label>Nom :</label><input type="text" id="dir_name_${form.id}" required>
                    <label>Signature :</label><input type="text" id="dir_signature_${form.id}" required>
                    <button data-id="${form.id}" onclick="validateDirection(${form.id})">Valider</button>
                `;
                directionList.appendChild(div);
            });
        })
        .catch((error) => {
            console.error('Error fetching Direction list:', error);
        });
}

// Update Direction archive
function updateDirectionArchive() {
    console.log('Updating Direction archive...');
    db.collection('visitors').get()
        .then((querySnapshot) => {
            const directionArchiveList = document.getElementById('directionArchiveList');
            directionArchiveList.innerHTML = '';
            querySnapshot.forEach((doc) => {
                const form = doc.data();
                if (form.status !== 'pending_rh' && form.status !== 'pending_direction') {
                    const div = document.createElement('div');
                    div.classList.add('validation-section');
                    div.innerHTML = `
                        <p><strong>Demandeur :</strong> ${form.demandeur_nom || 'N/A'}</p>
                        <p><strong>Visiteur :</strong> ${form.visiteur_nom || 'N/A'}</p>
                        <p><strong>Motif :</strong> ${form.visiteur_motif || 'N/A'}</p>
                        <p><strong>Date :</strong> ${form.visiteur_date || 'N/A'}</p>
                        <p><strong>Entreprise / Organisation :</strong> ${form.visiteur_entreprise || 'N/A'}</p>
                        ${form.dir_name ? `<p><strong>Décision Direction :</strong> ${form.dir_decision === 'approved' ? 'Accordé' : 'Refusé'} par ${form.dir_name}</p>` : '<p><strong>Décision Direction :</strong> En attente</p>'}
                        ${form.dir_name ? `<p><strong>Nom :</strong> ${form.dir_name}</p>` : ''}
                        ${form.dir_signature ? `<p><strong>Signature :</strong> ${form.dir_signature}</p>` : ''}
                    `;
                    directionArchiveList.appendChild(div);
                }
            });
            console.log('Direction archive updated, forms count:', querySnapshot.size);
        })
        .catch((error) => {
            console.error('Error fetching Direction archive:', error);
            alert('Erreur lors de la récupération de l\'archive Direction: ' + error.message);
        });
}

// Toggle Direction archive
function toggleDirectionArchive() {
    const archiveSection = document.getElementById('directionArchiveSection');
    const archiveToggle = document.getElementById('directionArchiveToggle');
    const isActive = archiveSection.classList.toggle('active');
    archiveToggle.textContent = isActive ? 'Masquer' : 'Afficher';
    if (isActive) {
        updateDirectionArchive();
    }
    console.log('Direction archive toggled:', isActive ? 'Shown' : 'Hidden');
}

// Export RH data to Excel
function exportRHToExcel() {
    console.log('Exporting RH data to Excel...');
    db.collection('visitors').get()
        .then((querySnapshot) => {
            let data = [];
            querySnapshot.forEach((doc) => {
                const form = doc.data();
                data.push({
                    'Demandeur': escapeCSVField(form.demandeur_nom || ''),
                    'Visiteur': escapeCSVField(form.visiteur_nom || ''),
                    'Motif': escapeCSVField(form.visiteur_motif || ''),
                    'Date': escapeCSVField(form.visiteur_date || ''),
                    'Entreprise / Organisation': escapeCSVField(form.visiteur_entreprise || ''),
                    'Décision RH': escapeCSVField(form.rh_name ? `${form.rh_decision === 'approved' ? 'Accordé' : 'Refusé'} par ${form.rh_name}` : 'En attente'),
                    'Nom RH': escapeCSVField(form.rh_name || ''),
                    'Signature RH': escapeCSVField(form.rh_signature || ''),
                    'Statut Final': escapeCSVField(form.final_status || '')
                });
            });

            let csv = 'Demandeur,Visiteur,Motif,Date,Entreprise / Organisation,Décision RH,Nom RH,Signature RH,Statut Final\n';
            data.forEach(row => {
                csv += `${row['Demandeur']},${row['Visiteur']},${row['Motif']},${row['Date']},${row['Entreprise / Organisation']},${row['Décision RH']},${row['Nom RH']},${row['Signature RH']},${row['Statut Final']}\n`;
            });

            const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'RH_Validation_' + new Date().toISOString().slice(0, 10) + '.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        })
        .catch((error) => {
            console.error('Error exporting RH data:', error);
            alert('Erreur lors de l\'exportation des données RH: ' + error.message);
        });
}

// Export Direction data to Excel
function exportDirectionToExcel() {
    console.log('Exporting Direction data to Excel...');
    db.collection('visitors').get()
        .then((querySnapshot) => {
            let data = [];
            querySnapshot.forEach((doc) => {
                const form = doc.data();
                data.push({
                    'Demandeur': escapeCSVField(form.demandeur_nom || ''),
                    'Visiteur': escapeCSVField(form.visiteur_nom || ''),
                    'Motif': escapeCSVField(form.visiteur_motif || ''),
                    'Date': escapeCSVField(form.visiteur_date || ''),
                    'Entreprise / Organisation': escapeCSVField(form.visiteur_entreprise || ''),
                    'RH Validation': escapeCSVField(form.rh_name || ''),
                    'Décision Direction': escapeCSVField(form.dir_name ? `${form.dir_decision === 'approved' ? 'Accordé' : 'Refusé'} par ${form.dir_name}` : 'En attente'),
                    'Nom Direction': escapeCSVField(form.dir_name || ''),
                    'Signature Direction': escapeCSVField(form.dir_signature || '')
                });
            });

            let csv = 'Demandeur,Visiteur,Motif,Date,Entreprise / Organisation,RH Validation,Décision Direction,Nom Direction,Signature Direction\n';
            data.forEach(row => {
                csv += `${row['Demandeur']},${row['Visiteur']},${row['Motif']},${row['Date']},${row['Entreprise / Organisation']},${row['RH Validation']},${row['Décision Direction']},${row['Nom Direction']},${row['Signature Direction']}\n`;
            });

            const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'Direction_Validation_' + new Date().toISOString().slice(0, 10) + '.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        })
        .catch((error) => {
            console.error('Error exporting Direction data:', error);
            alert('Erreur lors de l\'exportation des données Direction: ' + error.message);
        });
}

// Export Security data to Excel
function exportSecurityToExcel() {
    console.log('Exporting Security data to Excel...');
    db.collection('visitors').get()
        .then((querySnapshot) => {
            let data = [];
            querySnapshot.forEach((doc) => {
                const form = doc.data();
                let statutFinal = form.status;
                if (statutFinal === 'pending_rh') statutFinal = 'En attente RH';
                else if (statutFinal === 'pending_direction') statutFinal = 'En attente Direction';
                else if (statutFinal === 'pending_security') statutFinal = 'En attente Sécurité';
                else if (statutFinal === 'approved') statutFinal = 'Approuvé';
                else if (statutFinal === 'rejected') statutFinal = 'Refusé';
                else if (statutFinal === 'archived') statutFinal = 'Archivé';
                data.push({
                    'Visiteur': escapeCSVField(form.visiteur_nom || ''),
                    'Date': escapeCSVField(form.visiteur_date || ''),
                    'Demandeur': escapeCSVField(form.demandeur_nom || ''),
                    'Entreprise': escapeCSVField(form.visiteur_entreprise || ''),
                    'Heure d’arrivée prévue': escapeCSVField(form.visiteur_heure || ''),
                    'Motif': escapeCSVField(form.visiteur_motif || ''),
                    'Durée': escapeCSVField(form.visiteur_duree || ''),
                    'RH Validation': escapeCSVField(form.rh_name ? `${form.rh_decision === 'approved' ? 'Accordé' : 'Refusé'} par ${form.rh_name}` : ''),
                    'Direction Validation': escapeCSVField(form.dir_name ? `${form.dir_decision === 'approved' ? 'Accordé' : 'Refusé'} par ${form.dir_name}` : ''),
                    'Statut Final': escapeCSVField(statutFinal)
                });
            });

            let csv = 'Visiteur,Date,Demandeur,Entreprise,Heure d’arrivée prévue,Motif,Durée,RH Validation,Direction Validation,Statut Final\n';
            data.forEach(row => {
                csv += `${row['Visiteur']},${row['Date']},${row['Demandeur']},${row['Entreprise']},${row['Heure d’arrivée prévue']},${row['Motif']},${row['Durée']},${row['RH Validation']},${row['Direction Validation']},${row['Statut Final']}\n`;
            });

            const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'Security_Validation_' + new Date().toISOString().slice(0, 10) + '.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        })
        .catch((error) => {
            console.error('Error exporting Security data:', error);
            alert('Erreur lors de l\'exportation des données Sécurité: ' + error.message);
        });
}

// Setup real-time listeners for RH and Direction
function setupRealTimeListeners() {
    console.log('Setting up real-time listeners for role:', window.loggedInRole);
    if (window.unsubscribers) {
        window.unsubscribers.forEach(unsubscribe => unsubscribe());
    }
    window.unsubscribers = [];

    // Real-time listener for RH notifications
    const unsubscribeRHNotification = db.collection('visitors')
        .where('status', '==', 'pending_rh')
        .onSnapshot((snapshot) => {
            const rhBubble = document.getElementById('rhNotification');
            const count = snapshot.size;
            rhBubble.textContent = count;
            rhBubble.classList.toggle('hidden', count === 0);
            console.log('RH notification updated:', count);
        }, (error) => {
            console.error('Error in RH notification listener:', error);
        });
    window.unsubscribers.push(unsubscribeRHNotification);

    // Real-time listener for Direction notifications
    const unsubscribeDirNotification = db.collection('visitors')
        .where('status', '==', 'pending_direction')
        .onSnapshot((snapshot) => {
            const dirBubble = document.getElementById('directionNotification');
            const count = snapshot.size;
            dirBubble.textContent = count;
            dirBubble.classList.toggle('hidden', count === 0);
            console.log('Direction notification updated:', count);
        }, (error) => {
            console.error('Error in Direction notification listener:', error);
        });
    window.unsubscribers.push(unsubscribeDirNotification);

    // Real-time listener for Security notifications
    const unsubscribeSecNotification = db.collection('visitors')
        .where('status', 'in', ['approved', 'rejected'])
        .onSnapshot((snapshot) => {
            const secBubble = document.getElementById('securityNotification');
            const count = snapshot.size;
            secBubble.textContent = count;
            secBubble.classList.toggle('hidden', count === 0);
            console.log('Security notification updated:', count);
        }, (error) => {
            console.error('Error in Security notification listener:', error);
        });
    window.unsubscribers.push(unsubscribeSecNotification);

    // Real-time listener for RH list
    if (window.loggedInRole === 'rh') {
        const unsubscribeRH = db.collection('visitors')
            .where('status', '==', 'pending_rh')
            .onSnapshot((snapshot) => {
                console.log('RH list updated in real-time, count:', snapshot.size);
                const rhList = document.getElementById('rhFormList');
                rhList.innerHTML = '';
                snapshot.forEach((doc) => {
                    const form = doc.data();
                    const div = document.createElement('div');
                    div.classList.add('validation-section');
                    div.innerHTML = `
                        <p><strong>Demandeur :</strong> ${form.demandeur_nom || 'N/A'}</p>
                        <p><strong>Visiteur :</strong> ${form.visiteur_nom || 'N/A'}</p>
                        <p><strong>Motif :</strong> ${form.visiteur_motif || 'N/A'}</p>
                        <p><strong>Date :</strong> ${form.visiteur_date || 'N/A'}</p>
                        <p><strong>Entreprise / Organisation :</strong> ${form.visiteur_entreprise || 'N/A'}</p>
                        <div class="approved"><label><input type="radio" name="rh_${form.id}" value="approved" required> Accordé</label></div>
                        <div class="rejected"><label><input type="radio" name="rh_${form.id}" value="rejected"> Refusé</label></div>
                        <br>
                        <label>Nom :</label><input type="text" id="rh_name_${form.id}" required>
                        <label>Signature :</label><input type="text" id="rh_signature_${form.id}" required>
                        <button data-id="${form.id}" onclick="validateRH(${form.id})">Valider</button>
                    `;
                    rhList.appendChild(div);
                });
            }, (error) => {
                console.error('Error in RH real-time listener:', error);
            });
        window.unsubscribers.push(unsubscribeRH);
    } else if (window.loggedInRole === 'direction') {
        const unsubscribeDirection = db.collection('visitors')
            .where('status', '==', 'pending_direction')
            .onSnapshot((snapshot) => {
                console.log('Direction list updated in real-time, count:', snapshot.size);
                const directionList = document.getElementById('directionFormList');
                directionList.innerHTML = '';
                snapshot.forEach((doc) => {
                    const form = doc.data();
                    const div = document.createElement('div');
                    div.classList.add('validation-section');
                    div.innerHTML = `
                        <p><strong>Demandeur :</strong> ${form.demandeur_nom || 'N/A'}</p>
                        <p><strong>Visiteur :</strong> ${form.visiteur_nom || 'N/A'}</p>
                        <p><strong>Motif :</strong> ${form.visiteur_motif || 'N/A'}</p>
                        <p><strong>Date :</strong> ${form.visiteur_date || 'N/A'}</p>
                        <p><strong>Entreprise / Organisation :</strong> ${form.visiteur_entreprise || 'N/A'}</p>
                        <p><strong>RH Validation :</strong> ${form.rh_name || 'N/A'}</p>
                        <div class="approved"><label><input type="radio" name="dir_${form.id}" value="approved" required> Accordé</label></div>
                        <div class="rejected"><label><input type="radio" name="dir_${form.id}" value="rejected"> Refusé</label></div>
                        <br>
                        <label>Nom :</label><input type="text" id="dir_name_${form.id}" required>
                        <label>Signature :</label><input type="text" id="dir_signature_${form.id}" required>
                        <button data-id="${form.id}" onclick="validateDirection(${form.id})">Valider</button>
                    `;
                    directionList.appendChild(div);
                });
            }, (error) => {
                console.error('Error in Direction real-time listener:', error);
            });
        window.unsubscribers.push(unsubscribeDirection);
    }
}

// Initialize Firebase and setup event listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded, initializing Firebase...');
    const firebaseConfig = {
        apiKey: "AIzaSyDz91WZo_FB3OUwJ09kQnSKHYM9cYpSZqI",
        authDomain: "visiteur-externe.firebaseapp.com",
        projectId: "visiteur-externe",
        storageBucket: "visiteur-externe.firebasestorage.app",
        messagingSenderId: "304390681920",
        appId: "1:304390681920:web:f77468807d31ae6008b6a5",
        measurementId: "G-KB5RDKDY40"
    };

    try {
        const firebaseApp = firebase.initializeApp(firebaseConfig);
        console.log('Firebase initialized successfully with app:', firebaseApp.name);
        window.auth = firebase.auth();
        window.db = firebase.firestore();
        window.forms = [];
        window.currentSection = '';
        window.loggedInRole = '';
        window.unsubscribers = [];
        firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
            .then(() => console.log('Auth persistence set to LOCAL'))
            .catch((error) => console.error('Error setting persistence:', error));
    } catch (error) {
        console.error('Firebase initialization failed:', error);
        document.getElementById('error').textContent = 'Erreur d\'initialisation Firebase. Vérifiez la console.';
        return;
    }

    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');

    hamburger.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });

    document.querySelectorAll('.sidebar h2').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
            }
        });
    });

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        console.log('Login form event listener attached');
    } else {
        console.error('Login form not found');
    }

    document.getElementById('visitorForm').addEventListener('submit', submitForm);

    restrictPastDates();

    // Initialize notification bubbles
    updateNotificationBubbles();

    showSection('visitor');

    window.auth.onAuthStateChanged((user) => {
        console.log('Auth state changed:', user ? 'Logged in' : 'Logged out', 'User:', user);
        if (user && window.loggedInRole) {
            setupRealTimeListeners();
        } else if (!user && window.loggedInRole) {
            console.log('User logged out, resetting role and unsubscribing');
            window.loggedInRole = '';
            if (window.unsubscribers) {
                window.unsubscribers.forEach(unsubscribe => unsubscribe());
                window.unsubscribers = [];
            }
            showSection('visitor');
        }
    });
});
