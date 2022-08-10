const start = document.getElementById('start');
const name = document.getElementById('name');
const out = document.getElementById('out');

start.addEventListener('click', async () => {
  const result = await window.electronAPI.getProcList(name.value);
  if (result.processes !== null) {
    const tableList = result.processes;
    for (let i = 0; i < tableList.length; i += 1) {
      const row = out.insertRow();
      row.insertCell(0).innerHTML = '<button type="button" name="kill">Close</button>';
      row.insertCell(1).innerHTML = tableList[i].shift().trim();
      row.insertCell(2).innerHTML = tableList[i].join(',').trim();
    }
  } else {
    out.innerText = result.error;
  }
});

out.addEventListener('click', async (evt) => {
  const node = evt.target || evt.srcElement;
  if (node.name === 'kill') {
    const result = await window.electronAPI
      .killProcByPID(node.parentElement.parentElement.cells[1].innerText);
    if (result.result !== null) {
      node.parentElement.parentElement.remove();
    } else {
      alert(result.error);
    }
  }
});

const modal = document.getElementById('searchModal');
const searchBtn = document.getElementById('searchButton');
const search = document.getElementById('search');
const searchVal = document.getElementById('searchVal');
const span = document.getElementsByClassName('close')[0];

searchBtn.onclick = () => {
  modal.style.display = 'block';
};
search.onclick = () => {
  // modal.style.display = "none";
  window.find(searchVal.value);
};

span.onclick = () => {
  modal.style.display = 'none';
};

window.onclick = (event) => {
  if (event.target === modal) {
    modal.style.display = 'none';
  }
};
