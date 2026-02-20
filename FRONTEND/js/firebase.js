/*********** FIREBASE CONFIG ***********/
const firebaseConfig = {
  apiKey: "AIzaSyARsBCcTWZEgSQ0CBCiLpFAweBJwpQKD3Q",
  authDomain: "plant-tracker-005.firebaseapp.com",
  projectId: "plant-tracker-005",
  storageBucket: "plant-tracker-005.appspot.com",
  messagingSenderId: "174180572500",
  appId: "1:174180572500:web:f327f6b298a3c8b22dbcc1"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

async function updateAnalytics(){

  try{

    var tasks = await getTasksForUser() || [];
    var plants = await getPlantsForUser() || [];

    var total = tasks.length;

    document.getElementById("totalCareActions").innerText = total;

    var water = tasks.filter(t => (t.title||"").toLowerCase().includes("water")).length;
    var fert = tasks.filter(t => (t.title||"").toLowerCase().includes("fert")).length;
    var cut = tasks.filter(t => (t.title||"").toLowerCase().includes("cut")).length;

    document.getElementById("monthlyReportList").innerHTML =
      "<li>Watering done: "+water+"</li>"+
      "<li>Fertilizer used: "+fert+"</li>"+
      "<li>Cutting tasks: "+cut+"</li>";

    var score = plants.length ? Math.min(100, 50 + total*5) : 0;
    document.getElementById("healthScoreValue").innerText = score + "%";

    document.getElementById("careStreakValue").innerText =
      total > 0 ? total + " Days" : "0 Days";

  }catch(e){
    console.log("Analytics Error", e);
  }

}


/*********** END FIREBASE CONFIG ***********/

