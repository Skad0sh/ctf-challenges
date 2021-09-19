function get_roles(){
    const role=document.getElementById("role").value
    fetch('http://172.17.0.2:5555/verify_roles?role='+role).then(response=>
        response.text()
    ).then(data =>{
        document.getElementById("output").innerHTML=data;
    })
}