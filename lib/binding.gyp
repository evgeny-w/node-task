{
  "targets": [
    {
      "target_name": "winAPI",
      "conditions":[
        ["OS==\"win\"",{
          "sources":["winAPI.cc"]
        }]
      ]
    },
    {
      "target_name": "darwinAPI",
      "conditions":[
        ["OS==\"mac\"",{
          "sources":["darwinAPI.cc"]
        }]
      ]
    }
  ]
}