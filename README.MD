# PH Address Demo
Philippine addresses with PSGC codes demo.

## Install

In mongo
    use admin
    db.auth("ecUserAdmin", "{{see credentials.json}}" )
    
    use psgc
    db.createUser(
        {
            user: "psgcUser",
            pwd: '{{see credentials.json}}',
            roles: [
                { role: "readWrite", db: "psgc" }
            ]
        }
    )