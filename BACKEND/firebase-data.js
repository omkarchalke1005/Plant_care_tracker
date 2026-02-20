function getPlantsForUser() {
  return new Promise((resolve, reject) => {
    if (!currentUser) {
      resolve([]);
      return;
    }
    db.collection('users').doc(currentUser.uid).collection('plants').get()
      .then(snapshot => {
        const plants = [];
        snapshot.forEach(doc => {
          plants.push({ id: doc.id, ...doc.data() });
        });
        resolve(plants);
      })
      .catch(error => {
        console.error('Error getting plants:', error);
        resolve([]);
      });
  });
}

function savePlant(plant) {
  return new Promise((resolve, reject) => {
    if (!currentUser) {
      reject('No user logged in');
      return;
    }
    const plantRef = db.collection('users').doc(currentUser.uid).collection('plants').doc();
    plantRef.set(plant)
      .then(() => resolve(plantRef.id))
      .catch(error => reject(error));
  });
}

function updatePlant(plantId, plant) {
  return new Promise((resolve, reject) => {
    if (!currentUser) {
      reject('No user logged in');
      return;
    }
    db.collection('users').doc(currentUser.uid).collection('plants').doc(plantId).update(plant)
      .then(() => resolve())
      .catch(error => reject(error));
  });
}

function deletePlant(plantId) {
  return new Promise((resolve, reject) => {
    if (!currentUser) {
      reject('No user logged in');
      return;
    }
    db.collection('users').doc(currentUser.uid).collection('plants').doc(plantId).delete()
      .then(() => resolve())
      .catch(error => reject(error));
  });
}

function getTasksForUser() {
  return new Promise((resolve, reject) => {
    if (!currentUser) {
      resolve([]);
      return;
    }
    db.collection('users').doc(currentUser.uid).collection('tasks').get()
      .then(snapshot => {
        const tasks = [];
        snapshot.forEach(doc => {
          tasks.push({ id: doc.id, ...doc.data() });
        });
        resolve(tasks);
      })
      .catch(error => {
        console.error('Error getting tasks:', error);
        resolve([]);
      });
  });
}

function saveTask(task) {
  return new Promise((resolve, reject) => {
    if (!currentUser) {
      reject('No user logged in');
      return;
    }
    const taskRef = db.collection('users').doc(currentUser.uid).collection('tasks').doc();
    taskRef.set(task)
      .then(() => resolve(taskRef.id))
      .catch(error => reject(error));
  });
}

function deleteTask(taskId) {
  return new Promise((resolve, reject) => {
    if (!currentUser) {
      reject('No user logged in');
      return;
    }
    db.collection('users').doc(currentUser.uid).collection('tasks').doc(taskId).delete()
      .then(() => resolve())
      .catch(error => reject(error));
  });
}

