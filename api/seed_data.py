"""
Seed script to generate sample data for Fund Ops Admin (MongoDB)
Run: python seed_data.py
"""

import random
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from pymongo import MongoClient
from config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Sample data
ORGANIZATION_NAMES = [
    ("Blackstone Real Estate", "BRE"),
    ("Vanguard Property Fund", "VPF"),
    ("Goldman Sachs Realty", "GSR"),
    ("Morgan Stanley Real Assets", "MSRA"),
    ("JP Morgan Property Trust", "JPPT"),
    ("Brookfield Asset Management", "BAM"),
    ("CBRE Investment Management", "CBRE"),
    ("Starwood Capital Group", "SCG"),
]

FUND_TYPES = ["real_estate", "private_equity", "hedge_fund", "venture_capital", "infrastructure"]
FUND_STATUSES = ["active", "closed", "fundraising"]

PROPERTY_TYPES = ["office", "retail", "industrial", "residential", "mixed_use", "hotel"]
PROPERTY_STATUSES = ["active", "under_development", "sold", "under_contract"]

INVESTOR_TYPES = ["institutional", "individual", "family_office", "pension_fund", "endowment", "sovereign_wealth"]

# Organization-level roles (not platform level)
ROLES = [
    "admin",          # Organization admin - can manage users in their org
    "fund_manager",   # Can manage funds
    "analyst",        # Can view and analyze data
    "viewer",         # Read-only access
]

FIRST_NAMES = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
               "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
               "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Lisa", "Daniel", "Nancy"]

LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
              "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
              "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White"]

CITIES = [
    ("New York", "NY", "USA"),
    ("Los Angeles", "CA", "USA"),
    ("Chicago", "IL", "USA"),
    ("Houston", "TX", "USA"),
    ("Phoenix", "AZ", "USA"),
    ("San Francisco", "CA", "USA"),
    ("Boston", "MA", "USA"),
    ("Seattle", "WA", "USA"),
    ("Miami", "FL", "USA"),
    ("Denver", "CO", "USA"),
    ("London", "", "UK"),
    ("Toronto", "ON", "Canada"),
]

STREET_NAMES = ["Main St", "Oak Ave", "Park Blvd", "Market St", "Broadway", "Wall St",
                "Madison Ave", "Fifth Ave", "Commerce Dr", "Financial Way"]


def random_date(start_year=2018, end_year=2024):
    start = datetime(start_year, 1, 1, tzinfo=timezone.utc)
    end = datetime(end_year, 12, 31, tzinfo=timezone.utc)
    delta = end - start
    random_days = random.randint(0, delta.days)
    return start + timedelta(days=random_days)


def create_organizations(db) -> list:
    """Create sample organizations"""
    organizations = []
    for name, code in ORGANIZATION_NAMES:
        org = {
            "name": name,
            "code": code,
            "description": f"{name} - A leading investment management firm",
            "is_active": True,
            "created_at": random_date(2018, 2022),
            "updated_at": None
        }
        result = db.organizations.insert_one(org)
        org["_id"] = result.inserted_id
        organizations.append(org)

    print(f"Created {len(organizations)} organizations")
    return organizations


def create_users(db, count: int = 30) -> list:
    """Create sample users"""
    users = []
    used_usernames = set()

    for i in range(count):
        first_name = random.choice(FIRST_NAMES)
        last_name = random.choice(LAST_NAMES)

        # Generate unique username
        base_username = f"{first_name.lower()}.{last_name.lower()}"
        username = base_username
        counter = 1
        while username in used_usernames:
            username = f"{base_username}{counter}"
            counter += 1
        used_usernames.add(username)

        user = {
            "username": username,
            "email": f"{username}@fundops.com",
            "hashed_password": pwd_context.hash("password123"),
            "first_name": first_name,
            "last_name": last_name,
            "is_active": True,
            "is_superuser": False,
            "created_at": random_date(2020, 2024),
            "updated_at": None
        }
        result = db.users.insert_one(user)
        user["_id"] = result.inserted_id
        users.append(user)

    print(f"Created {len(users)} users")
    return users


def create_user_organization_mappings(db, users: list, organizations: list):
    """Map users to organizations with roles"""
    mappings_created = 0

    for user in users:
        # Each user belongs to 1-3 organizations
        num_orgs = random.randint(1, 3)
        user_orgs = random.sample(organizations, min(num_orgs, len(organizations)))

        for i, org in enumerate(user_orgs):
            role = random.choice(ROLES)
            mapping = {
                "user_id": str(user["_id"]),
                "organization_id": str(org["_id"]),
                "role": role,
                "is_primary": (i == 0),  # First org is primary
                "joined_at": random_date(2021, 2024),
                "created_at": datetime.now(timezone.utc),
                "updated_at": None
            }
            db.user_organizations.insert_one(mapping)
            mappings_created += 1

    print(f"Created {mappings_created} user-organization mappings")


def create_funds(db, organizations: list) -> list:
    """Create sample funds for each organization"""
    funds = []
    fund_names = [
        "Core Plus Fund", "Value-Add Fund", "Opportunistic Fund", "Growth Fund",
        "Income Fund", "Development Fund", "Debt Fund", "Balanced Fund",
        "Strategic Fund", "Global Fund", "Domestic Fund", "International Fund"
    ]

    for org in organizations:
        # Each organization has 2-5 funds
        num_funds = random.randint(2, 5)
        org_fund_names = random.sample(fund_names, num_funds)

        for fund_name in org_fund_names:
            target_size = random.randint(100, 2000) * 1_000_000  # $100M to $2B
            current_size = int(target_size * random.uniform(0.3, 1.2))

            fund = {
                "name": f"{org['code']} {fund_name}",
                "description": f"{fund_name} managed by {org['name']}",
                "fund_type": random.choice(FUND_TYPES),
                "target_size": target_size,
                "current_size": current_size,
                "currency": "USD",
                "vintage_year": random.randint(2018, 2024),
                "status": random.choice(FUND_STATUSES),
                "organization_id": str(org["_id"]),
                "created_at": random_date(2019, 2024),
                "updated_at": None
            }
            result = db.funds.insert_one(fund)
            fund["_id"] = result.inserted_id
            funds.append(fund)

    print(f"Created {len(funds)} funds")
    return funds


def create_investors(db, organizations: list, count: int = 50) -> list:
    """Create sample investors and assign them to organizations"""
    investors = []

    investor_name_prefixes = [
        "California Public", "New York State", "Texas Teachers", "Ohio Municipal",
        "Pacific Coast", "Atlantic", "Midwest", "Southern States", "Northern Trust",
        "Heritage", "Legacy", "Pinnacle", "Summit", "Horizon", "Foundation"
    ]

    investor_name_suffixes = [
        "Pension Fund", "Endowment", "Family Office", "Investment Trust",
        "Capital Partners", "Wealth Management", "Investment Group", "Holdings"
    ]

    used_names = set()

    for i in range(count):
        # Generate unique investor name
        name = f"{random.choice(investor_name_prefixes)} {random.choice(investor_name_suffixes)}"
        while name in used_names:
            name = f"{random.choice(investor_name_prefixes)} {random.choice(investor_name_suffixes)} {random.randint(1, 99)}"
        used_names.add(name)

        city, state, country = random.choice(CITIES)

        # Assign investor to a random organization
        org = random.choice(organizations)
        commitment_amount = random.randint(10, 500) * 1_000_000  # $10M to $500M

        investor = {
            "name": name,
            "investor_type": random.choice(INVESTOR_TYPES),
            "email": f"contact@{name.lower().replace(' ', '')[:20]}.com",
            "phone": f"+1-{random.randint(200,999)}-{random.randint(100,999)}-{random.randint(1000,9999)}",
            "address": f"{random.randint(100, 9999)} {random.choice(STREET_NAMES)}",
            "city": city,
            "state": state,
            "country": country,
            "commitment_amount": commitment_amount,
            "funded_amount": 0,  # Will be calculated from fund allocations
            "organization_id": str(org["_id"]),
            "status": "active" if random.random() > 0.1 else "inactive",
            "is_active": random.random() > 0.1,  # 90% active
            "created_at": random_date(2019, 2024),
            "updated_at": None
        }
        result = db.investors.insert_one(investor)
        investor["_id"] = result.inserted_id
        investors.append(investor)

    print(f"Created {len(investors)} investors")
    return investors


def create_investor_fund_allocations(db, investors: list, funds: list) -> int:
    """Create investor-fund allocations with percentage allocations"""
    allocations_created = 0

    # Group funds by organization
    org_funds = {}
    for fund in funds:
        org_id = fund["organization_id"]
        if org_id not in org_funds:
            org_funds[org_id] = []
        org_funds[org_id].append(fund)

    for investor in investors:
        org_id = investor["organization_id"]
        available_funds = org_funds.get(org_id, [])

        if not available_funds:
            continue

        # Each investor invests in 1-3 funds from their organization
        num_funds = min(random.randint(1, 3), len(available_funds))
        selected_funds = random.sample(available_funds, num_funds)

        # Generate allocation percentages that sum to 100%
        if num_funds == 1:
            percentages = [100.0]
        else:
            # Generate random percentages
            raw_percentages = [random.randint(20, 60) for _ in range(num_funds)]
            total = sum(raw_percentages)
            percentages = [round((p / total) * 100, 1) for p in raw_percentages]
            # Adjust last one to ensure sum is exactly 100
            percentages[-1] = round(100 - sum(percentages[:-1]), 1)

        total_commitment = investor["commitment_amount"]
        total_funded = 0

        for fund, percentage in zip(selected_funds, percentages):
            fund_commitment = int(total_commitment * (percentage / 100))
            fund_funded = int(fund_commitment * random.uniform(0.3, 1.0))
            total_funded += fund_funded

            allocation = {
                "investor_id": str(investor["_id"]),
                "fund_id": str(fund["_id"]),
                "allocation_percentage": percentage,
                "commitment_amount": fund_commitment,
                "funded_amount": fund_funded,
                "status": "active",
                "created_at": random_date(2020, 2024),
                "updated_at": None
            }
            db.investor_funds.insert_one(allocation)
            allocations_created += 1

        # Update investor's total funded amount
        db.investors.update_one(
            {"_id": investor["_id"]},
            {"$set": {"funded_amount": total_funded}}
        )

    print(f"Created {allocations_created} investor-fund allocations")
    return allocations_created


def create_properties(db, funds: list, count: int = 40) -> list:
    """Create sample properties and assign them to funds"""
    properties = []

    property_name_prefixes = [
        "Tower", "Plaza", "Center", "Park", "Gardens", "Heights", "Square",
        "Commons", "Place", "Court", "Point", "Ridge", "View", "Landing"
    ]

    for i in range(count):
        city, state, country = random.choice(CITIES)
        property_type = random.choice(PROPERTY_TYPES)

        name = f"{city} {random.choice(property_name_prefixes)}"
        if random.random() > 0.5:
            name = f"{random.randint(100, 999)} {random.choice(STREET_NAMES)} {random.choice(property_name_prefixes)}"

        acquisition_price = random.randint(10, 500) * 1_000_000  # $10M to $500M
        current_value = int(acquisition_price * random.uniform(0.8, 1.5))

        # Assign property to a random fund
        fund = random.choice(funds)

        prop = {
            "name": name,
            "property_type": property_type,
            "address": f"{random.randint(100, 9999)} {random.choice(STREET_NAMES)}",
            "city": city,
            "state": state,
            "country": country,
            "acquisition_date": random_date(2018, 2023),
            "acquisition_price": acquisition_price,
            "current_value": current_value,
            "square_footage": random.randint(50000, 500000),
            "fund_id": str(fund["_id"]),
            "status": random.choice(PROPERTY_STATUSES),
            "created_at": random_date(2019, 2024),
            "updated_at": None
        }
        result = db.properties.insert_one(prop)
        prop["_id"] = result.inserted_id
        properties.append(prop)

    print(f"Created {len(properties)} properties")
    return properties


def create_admin_users(db, organizations: list) -> list:
    """Create super admin and org admin users for testing"""
    admins = []

    # 1. Platform Super Admin (can access everything)
    super_admin = {
        "username": "superadmin",
        "email": "superadmin@fundops.com",
        "hashed_password": pwd_context.hash("admin123"),
        "first_name": "Platform",
        "last_name": "Super Admin",
        "is_active": True,
        "is_superuser": True,  # Platform-level super admin
        "created_at": datetime.now(timezone.utc),
        "updated_at": None
    }
    result = db.users.insert_one(super_admin)
    super_admin["_id"] = result.inserted_id
    admins.append(super_admin)

    # Super admin doesn't need org mappings - they can see all orgs via is_superuser flag
    print(f"Created platform super admin (username: superadmin, password: admin123)")

    # 2. System Admin - has 'admin' role in ALL organizations
    sys_admin = {
        "username": "sysadmin",
        "email": "sysadmin@fundops.com",
        "hashed_password": pwd_context.hash("admin123"),
        "first_name": "System",
        "last_name": "Admin",
        "is_active": True,
        "is_superuser": False,  # Not a platform super admin, but admin in all orgs
        "created_at": datetime.now(timezone.utc),
        "updated_at": None
    }
    result = db.users.insert_one(sys_admin)
    sys_admin["_id"] = result.inserted_id
    admins.append(sys_admin)

    # Map system admin to ALL organizations with 'admin' role
    for i, org in enumerate(organizations):
        mapping = {
            "user_id": str(sys_admin["_id"]),
            "organization_id": str(org["_id"]),
            "role": "admin",  # Organization-level admin role
            "is_primary": (i == 0),
            "joined_at": datetime.now(timezone.utc),
            "created_at": datetime.now(timezone.utc),
            "updated_at": None
        }
        db.user_organizations.insert_one(mapping)

    print(f"Created system admin (username: sysadmin, password: admin123) - admin in all {len(organizations)} orgs")

    # 2. Organization Admin for first org (can manage users in their org only)
    if len(organizations) > 0:
        org_admin = {
            "username": "orgadmin",
            "email": "orgadmin@fundops.com",
            "hashed_password": pwd_context.hash("admin123"),
            "first_name": "Organization",
            "last_name": "Admin",
            "is_active": True,
            "is_superuser": False,  # NOT a platform super admin
            "created_at": datetime.now(timezone.utc),
            "updated_at": None
        }
        result = db.users.insert_one(org_admin)
        org_admin["_id"] = result.inserted_id
        admins.append(org_admin)

        # Map org admin to first two organizations with 'admin' role
        for i, org in enumerate(organizations[:2]):
            mapping = {
                "user_id": str(org_admin["_id"]),
                "organization_id": str(org["_id"]),
                "role": "admin",  # Organization-level admin role
                "is_primary": (i == 0),
                "joined_at": datetime.now(timezone.utc),
                "created_at": datetime.now(timezone.utc),
                "updated_at": None
            }
            db.user_organizations.insert_one(mapping)

        print(f"Created org admin (username: orgadmin, password: admin123) - admin for {organizations[0]['name']}")

    # 3. Regular user (viewer role) for testing
    if len(organizations) > 0:
        regular_user = {
            "username": "viewer",
            "email": "viewer@fundops.com",
            "hashed_password": pwd_context.hash("admin123"),
            "first_name": "Regular",
            "last_name": "Viewer",
            "is_active": True,
            "is_superuser": False,
            "created_at": datetime.now(timezone.utc),
            "updated_at": None
        }
        result = db.users.insert_one(regular_user)
        regular_user["_id"] = result.inserted_id
        admins.append(regular_user)

        # Map viewer to first org with 'viewer' role
        mapping = {
            "user_id": str(regular_user["_id"]),
            "organization_id": str(organizations[0]["_id"]),
            "role": "viewer",  # Read-only role
            "is_primary": True,
            "joined_at": datetime.now(timezone.utc),
            "created_at": datetime.now(timezone.utc),
            "updated_at": None
        }
        db.user_organizations.insert_one(mapping)

        print(f"Created viewer user (username: viewer, password: admin123) - viewer in {organizations[0]['name']}")

    return admins


def seed_database():
    """Main function to seed the database"""
    print("=" * 50)
    print("Fund Ops Admin - MongoDB Database Seeder")
    print("=" * 50)

    # Connect to MongoDB
    client = MongoClient(settings.database_url)
    db = client[settings.MONGODB_DB]

    try:
        # Check if data already exists
        existing_orgs = db.organizations.count_documents({})
        if existing_orgs > 0:
            response = input(f"Database already has {existing_orgs} organizations. Clear and reseed? (y/n): ")
            if response.lower() != 'y':
                print("Seeding cancelled.")
                return

            # Clear existing data
            print("Clearing existing data...")
            db.investor_funds.delete_many({})
            db.user_organizations.delete_many({})
            db.funds.delete_many({})
            db.properties.delete_many({})
            db.investors.delete_many({})
            db.users.delete_many({})
            db.organizations.delete_many({})

        print("\nSeeding database...\n")

        # Create data
        organizations = create_organizations(db)
        users = create_users(db, count=30)
        create_user_organization_mappings(db, users, organizations)
        admins = create_admin_users(db, organizations)
        funds = create_funds(db, organizations)
        investors = create_investors(db, organizations, count=50)
        allocations_count = create_investor_fund_allocations(db, investors, funds)
        properties = create_properties(db, funds, count=40)

        # Create indexes
        print("\nCreating indexes...")
        db.users.create_index("username", unique=True)
        db.users.create_index("email", unique=True)
        db.organizations.create_index("code", unique=True)
        db.user_organizations.create_index([("user_id", 1), ("organization_id", 1)], unique=True)
        db.funds.create_index("organization_id")
        db.investors.create_index("organization_id")
        db.investor_funds.create_index("investor_id")
        db.investor_funds.create_index("fund_id")
        db.investor_funds.create_index([("investor_id", 1), ("fund_id", 1)], unique=True)
        db.properties.create_index("fund_id")

        print("\n" + "=" * 50)
        print("Database seeding completed successfully!")
        print("=" * 50)
        print("\nSummary:")
        print(f"  - Organizations: {len(organizations)}")
        print(f"  - Users: {len(users) + len(admins)}")
        print(f"  - Funds: {len(funds)}")
        print(f"  - Investors: {len(investors)}")
        print(f"  - Investor-Fund Allocations: {allocations_count}")
        print(f"  - Properties: {len(properties)}")
        print("\nTest credentials (password: admin123):")
        print("  - Platform Super Admin: username=superadmin (is_superuser=true, platform level)")
        print("  - System Admin: username=sysadmin (admin role in ALL organizations)")
        print("  - Org Admin: username=orgadmin (admin role in first 2 orgs only)")
        print("  - Viewer: username=viewer (viewer role, read-only access)")
        print("  - Other users: password=password123")

    except Exception as e:
        print(f"Error seeding database: {e}")
        raise
    finally:
        client.close()


if __name__ == "__main__":
    seed_database()
