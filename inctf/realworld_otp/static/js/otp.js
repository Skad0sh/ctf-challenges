function send_mail()
{
    var email=document.getElementsByTagName('p')[0].value
    fetch('/otp', {
    method: 'post',
    body: 'email='+email
    })
    document.getElementById("output").innerHTML="OTP has been sent"
}