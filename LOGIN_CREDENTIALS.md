# WAA-100 Login Credentials

## Login Logic (Current)

- Email/password login requires a matching selected role (`Teacher`, `HOD`, or `Student`).
- If role does not match the user account role, login is rejected.
- Teacher accounts that are class teachers are still logged in as `Teacher` role.

## App Login (Email + Password)

### HOD Account

| Username (Email) | Password |
|---|---|
| rahul.gaikwad@university.edu | rahulgaikwad123 |

### Teacher Accounts

| Username (Email) | Password |
|---|---|
| prakash.mali@university.edu | prakash123 |
| preeti.raut@university.edu | preeti123 |
| vijay.mane@university.edu | vijay123 |
| sonali.matondkar@university.edu | sonali123 |
| rahul.joshi@university.edu | rahul123 |

### Student Accounts (2 from each class)

| Username (Email) | Password |
|---|---|
| aarav.patil@student.edu | aarav123 |
| rohan.kulkarni@student.edu | rohan123 |
| aditi.kulkarni@student.edu | aditi123 |
| sneha.patil@student.edu | sneha123 |
| arjun.malhotra@student.edu | arjun123 |
| devansh.verma@student.edu | devansh123 |
| ananya.malhotra@student.edu | ananya123 |
| kavya.verma@student.edu | kavya123 |

## Quick Role Login

- Available quick roles: `Teacher`, `HOD`, `Student`.
- Quick login does not use password and logs in as the first user found for that role.
