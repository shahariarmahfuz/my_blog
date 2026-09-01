import uuid
from typing import Dict, Any, List, Optional
from uuid import UUID
from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.member import Member
from app.models.group import Group
from app.models.contribution import Contribution, MonthlyContributionDue, MonthlyContributionAllocation, DueStatus
from app.models.ledger import FinancialTransaction
from app.models.setting import SystemSetting
from app.schemas.contribution import MonthScheduleItemOut, MemberMonthsScheduleResponse
from app.services.ledger_service import LedgerService

class MonthlyContributionService:
    @staticmethod
    def get_contribution_rules(db: Session) -> Dict[str, Any]:
        """
        Retrieves global contribution cycle configuration from system_settings.
        Defaults:
          default_monthly_contribution: 500.00
          monthly_due_day: 10
          grace_period_days: 5
          allow_partial_contributions: True
        """
        setting = db.query(SystemSetting).filter(SystemSetting.section == "contributions").first()
        data = setting.config_data if setting and setting.config_data else {}
        
        default_amount = Decimal(str(data.get("default_monthly_contribution", 500.00)))
        due_day = int(data.get("monthly_due_day", 10))
        grace_days = int(data.get("grace_period_days", 5))
        allow_partial = bool(data.get("allow_partial_contributions", True))

        return {
            "default_monthly_contribution": default_amount,
            "monthly_due_day": max(1, min(due_day, 28)),
            "grace_period_days": max(0, grace_days),
            "allow_partial_contributions": allow_partial,
            "currency": data.get("currency", "BDT (৳)")
        }

    @staticmethod
    def get_default_monthly_contribution(db: Session) -> Decimal:
        """Returns the global configured monthly contribution amount."""
        rules = MonthlyContributionService.get_contribution_rules(db)
        return rules["default_monthly_contribution"]

    @staticmethod
    def get_member_expected_amount(db: Session, member: Member) -> Decimal:
        """
        Returns the expected monthly contribution for a specific member.
        Uses member.monthly_contribution_amount if set; otherwise falls back to global default.
        """
        if member.monthly_contribution_amount is not None and member.monthly_contribution_amount >= Decimal("0.00"):
            return Decimal(str(member.monthly_contribution_amount))
        return MonthlyContributionService.get_default_monthly_contribution(db)

    @staticmethod
    def evaluate_due_status(
        expected_amount: Decimal,
        paid_amount: Decimal,
        due_date: date,
        grace_period_days: int = 5,
        as_of_date: Optional[date] = None
    ) -> str:
        """
        Evaluates due status based on paid amount, expected amount, due date, and grace period:
        - PAID: paid_amount >= expected_amount
        - PARTIAL: 0 < paid_amount < expected_amount
        - OVERDUE: paid_amount < expected_amount AND today > due_date + grace_period_days
        - DUE: paid_amount == 0 AND today <= due_date + grace_period_days
        """
        today = as_of_date or date.today()
        grace_deadline = due_date + timedelta(days=grace_period_days)

        if paid_amount >= expected_amount and expected_amount > Decimal("0.00"):
            return "PAID"
        elif paid_amount > Decimal("0.00") and paid_amount < expected_amount:
            if today > grace_deadline:
                return "OVERDUE"
            return "PARTIAL"
        elif paid_amount <= Decimal("0.00"):
            if today > grace_deadline:
                return "OVERDUE"
            return "DUE"
        
        return "PAID" if expected_amount == Decimal("0.00") else "DUE"

    @staticmethod
    def format_months_summary(months: List[date]) -> str:
        """
        Formats a list of dates into a clear, readable summary string.
        Examples:
          1 month: "September 2026"
          Contiguous range: "January 2026 – December 2026 (12 months)"
          Discrete: "Jan 2026, Mar 2026, May 2026 (3 months)"
        """
        if not months:
            return ""
        sorted_m = sorted(months)
        if len(sorted_m) == 1:
            return sorted_m[0].strftime("%B %Y")
        
        # Check if contiguous
        is_contiguous = True
        for i in range(len(sorted_m) - 1):
            curr_y, curr_m = sorted_m[i].year, sorted_m[i].month
            next_y, next_m = sorted_m[i+1].year, sorted_m[i+1].month
            expected_next_m = curr_m + 1 if curr_m < 12 else 1
            expected_next_y = curr_y if curr_m < 12 else curr_y + 1
            if next_y != expected_next_y or next_m != expected_next_m:
                is_contiguous = False
                break
        
        if is_contiguous:
            start_str = sorted_m[0].strftime("%B %Y")
            end_str = sorted_m[-1].strftime("%B %Y")
            return f"{start_str} – {end_str} ({len(sorted_m)} months)"
        
        # Discrete listing
        labels = [m.strftime("%b %Y") for m in sorted_m]
        if len(labels) <= 3:
            return f"{', '.join(labels)} ({len(sorted_m)} months)"
        return f"{', '.join(labels[:3])}... ({len(sorted_m)} months)"

    @staticmethod
    def ensure_due_for_member(
        db: Session,
        member: Member,
        target_month: date,
        custom_expected_amount: Optional[Decimal] = None
    ) -> MonthlyContributionDue:
        """
        Idempotently ensures a MonthlyContributionDue record exists for a member and month.
        Will NOT overwrite existing expected_amount on previously created dues.
        """
        first_of_month = date(target_month.year, target_month.month, 1)

        existing_due = db.query(MonthlyContributionDue).filter(
            MonthlyContributionDue.member_id == member.id,
            MonthlyContributionDue.contribution_month == first_of_month
        ).first()

        rules = MonthlyContributionService.get_contribution_rules(db)
        due_day = rules["monthly_due_day"]
        grace_days = rules["grace_period_days"]
        due_date = date(first_of_month.year, first_of_month.month, min(due_day, 28))

        if existing_due:
            # Re-evaluate status based on current payments and date
            status = MonthlyContributionService.evaluate_due_status(
                expected_amount=existing_due.expected_amount,
                paid_amount=existing_due.paid_amount,
                due_date=existing_due.due_date,
                grace_period_days=grace_days
            )
            if existing_due.status != status:
                existing_due.status = status
                db.flush()
            return existing_due

        # Determine expected amount for new due
        if custom_expected_amount is not None:
            expected = Decimal(str(custom_expected_amount))
        else:
            expected = MonthlyContributionService.get_member_expected_amount(db, member)

        # Calculate any existing payments/allocations recorded for this month
        paid_from_allocations = db.query(func.coalesce(func.sum(MonthlyContributionAllocation.allocated_amount), Decimal("0.00")))\
            .join(Contribution, Contribution.id == MonthlyContributionAllocation.contribution_id)\
            .filter(
                MonthlyContributionAllocation.member_id == member.id,
                MonthlyContributionAllocation.contribution_month == first_of_month,
                Contribution.is_voided == False
            ).scalar()

        # Legacy fallback if allocations were not populated
        paid_from_direct_contribs = db.query(func.coalesce(func.sum(Contribution.amount), Decimal("0.00"))).filter(
            Contribution.member_id == member.id,
            Contribution.is_voided == False,
            Contribution.contribution_month == first_of_month,
            ~Contribution.id.in_(
                db.query(MonthlyContributionAllocation.contribution_id).filter(
                    MonthlyContributionAllocation.member_id == member.id
                )
            )
        ).scalar()

        total_paid_initial = Decimal(str(paid_from_allocations or 0)) + Decimal(str(paid_from_direct_contribs or 0))
        remaining = max(Decimal("0.00"), expected - total_paid_initial)

        status = MonthlyContributionService.evaluate_due_status(
            expected_amount=expected,
            paid_amount=total_paid_initial,
            due_date=due_date,
            grace_period_days=grace_days
        )

        due = MonthlyContributionDue(
            member_id=member.id,
            group_id=member.group_id,
            contribution_month=first_of_month,
            due_date=due_date,
            expected_amount=expected,
            paid_amount=total_paid_initial,
            remaining_due=remaining,
            status=status
        )
        db.add(due)
        db.flush()
        return due

    @staticmethod
    def generate_dues_for_month(
        db: Session,
        target_month: date,
        group_id: Optional[UUID] = None
    ) -> List[MonthlyContributionDue]:
        """
        Generates/ensures monthly dues for all ACTIVE members for a target month.
        Inactive members are skipped.
        """
        first_of_month = date(target_month.year, target_month.month, 1)

        query = db.query(Member).filter(Member.is_active == True)
        if group_id:
            query = query.filter(Member.group_id == group_id)

        active_members = query.all()
        created_dues = []
        for m in active_members:
            due = MonthlyContributionService.ensure_due_for_member(db, m, first_of_month)
            created_dues.append(due)

        return created_dues

    @staticmethod
    def get_member_months_schedule(
        db: Session,
        member: Member,
        start_year: Optional[int] = None,
        end_year: Optional[int] = None
    ) -> MemberMonthsScheduleResponse:
        """
        Returns a multi-year monthly dues and payment schedule for a member.
        Used by the custom Multi-Month selector UI.
        """
        today = date.today()
        today_first = date(today.year, today.month, 1)

        s_year = start_year or (today.year - 1)
        e_year = end_year or (today.year + 1)

        monthly_pledge = MonthlyContributionService.get_member_expected_amount(db, member)
        rules = MonthlyContributionService.get_contribution_rules(db)
        grace_days = rules["grace_period_days"]

        items: List[MonthScheduleItemOut] = []
        unpaid_count = 0
        unpaid_total = Decimal("0.00")

        for y in range(s_year, e_year + 1):
            for m in range(1, 13):
                month_date = date(y, m, 1)
                due = MonthlyContributionService.ensure_due_for_member(db, member, month_date)

                is_paid = (due.remaining_due <= Decimal("0.00") and due.paid_amount > Decimal("0.00")) or (due.status == "PAID")
                is_current = (y == today.year and m == today.month)
                is_future = (month_date > today_first)
                is_overdue = (due.status == "OVERDUE")
                is_advance_paid = (is_future and is_paid)

                if not is_paid and due.remaining_due > Decimal("0.00"):
                    # Only count past and current unpaid dues toward the current arrears count
                    if month_date <= today_first:
                        unpaid_count += 1
                        unpaid_total += due.remaining_due

                month_str = f"{y:04d}-{m:02d}"
                month_label = month_date.strftime("%B %Y")
                short_label = month_date.strftime("%b %Y")

                items.append(MonthScheduleItemOut(
                    month=month_date,
                    month_str=month_str,
                    month_label=month_label,
                    short_label=short_label,
                    year=y,
                    month_num=m,
                    expected_amount=due.expected_amount,
                    paid_amount=due.paid_amount,
                    remaining_due=due.remaining_due,
                    status=due.status,
                    is_paid=is_paid,
                    is_overdue=is_overdue,
                    is_current=is_current,
                    is_future=is_future,
                    is_advance_paid=is_advance_paid,
                    due_date=due.due_date
                ))

        return MemberMonthsScheduleResponse(
            member_id=member.id,
            member_name=member.name,
            monthly_pledge=monthly_pledge,
            current_month=today.strftime("%Y-%m"),
            unpaid_months_count=unpaid_count,
            unpaid_total_due=unpaid_total,
            months=items
        )

    @staticmethod
    def record_multi_month_contribution(
        db: Session,
        member: Member,
        group: Group,
        selected_months: List[date],
        amount: Decimal,
        contribution_date: date,
        payment_method: Any,
        reference_number: Optional[str] = None,
        notes: Optional[str] = None,
        user_id: Optional[UUID] = None
    ) -> Contribution:
        """
        Executes a multi-month contribution payment:
        1. Ensures and validates selected months (prevents duplicate payment of already paid months).
        2. Allocates payment amount across each month.
        3. Creates 1 Contribution receipt.
        4. Creates MonthlyContributionAllocation records.
        5. Updates each MonthlyContributionDue record.
        6. Credits the Group's balance in the double-entry financial ledger ONCE.
        """
        if not selected_months:
            raise ValueError("At least one contribution month must be selected.")

        # Normalize and sort unique months
        unique_months = sorted(list(set(date(d.year, d.month, 1) for d in selected_months)))
        if len(unique_months) != len(selected_months):
            raise ValueError("Duplicate months detected in selection.")

        # Ensure dues and check for already-paid duplicates
        dues_to_fulfill: List[MonthlyContributionDue] = []
        total_remaining_needed = Decimal("0.00")

        for m_date in unique_months:
            due = MonthlyContributionService.ensure_due_for_member(db, member, m_date)
            if due.status == "PAID" or due.remaining_due <= Decimal("0.00"):
                raise ValueError(f"Month {m_date.strftime('%B %Y')} is already fully paid. Please uncheck it.")
            dues_to_fulfill.append(due)
            total_remaining_needed += due.remaining_due

        if amount <= Decimal("0.00"):
            raise ValueError("Contribution amount must be greater than 0.")

        # Generate unique receipt number
        year = contribution_date.year
        count = db.query(Contribution).count() + 1
        receipt_number = None
        for offset in range(500):
            candidate = f"CON-{year}-{(count + offset):04d}"
            exists_c = db.query(Contribution.id).filter(Contribution.receipt_number == candidate).first()
            exists_t = db.query(FinancialTransaction.id).filter(FinancialTransaction.transaction_code == f"TXN-{candidate}").first()
            if not exists_c and not exists_t:
                receipt_number = candidate
                break
        if not receipt_number:
            receipt_number = f"CON-{year}-{uuid.uuid4().hex[:6].upper()}"

        months_summary = MonthlyContributionService.format_months_summary(unique_months)
        months_covered_json = [m.isoformat() for m in unique_months]

        # 1. Create Parent Contribution Record
        contribution = Contribution(
            receipt_number=receipt_number,
            member_id=member.id,
            group_id=group.id,
            due_id=dues_to_fulfill[0].id if len(dues_to_fulfill) == 1 else None,
            amount=amount,
            contribution_date=contribution_date,
            contribution_month=unique_months[0],
            months_count=len(unique_months),
            months_summary=months_summary,
            months_covered=months_covered_json,
            payment_method=payment_method,
            reference_number=reference_number,
            notes=notes,
            created_by=user_id
        )
        db.add(contribution)
        db.flush() # obtain contribution.id

        # 2. Distribute amount across selected months and create allocations
        remaining_payment = amount
        rules = MonthlyContributionService.get_contribution_rules(db)
        grace_days = rules["grace_period_days"]

        for i, due in enumerate(dues_to_fulfill):
            if remaining_payment <= Decimal("0.00"):
                break

            # If this is the last month, allocate whatever remains of the payment
            if i == len(dues_to_fulfill) - 1:
                alloc_amount = remaining_payment
            else:
                # Allocate up to the due's remaining due
                alloc_amount = min(remaining_payment, due.remaining_due)

            alloc = MonthlyContributionAllocation(
                contribution_id=contribution.id,
                due_id=due.id,
                member_id=member.id,
                contribution_month=due.contribution_month,
                allocated_amount=alloc_amount
            )
            db.add(alloc)

            # Update due fulfillment
            due.paid_amount += alloc_amount
            due.remaining_due = max(Decimal("0.00"), due.expected_amount - due.paid_amount)
            due.status = MonthlyContributionService.evaluate_due_status(
                expected_amount=due.expected_amount,
                paid_amount=due.paid_amount,
                due_date=due.due_date,
                grace_period_days=grace_days
            )
            remaining_payment -= alloc_amount

        # 3. Record ONE financial credit in the Group's double-entry ledger
        LedgerService.record_contribution_ledger(db, contribution, user_id=user_id)

        db.flush()
        return contribution

    @staticmethod
    def recalculate_due_on_void(
        db: Session,
        contribution: Contribution
    ) -> List[MonthlyContributionDue]:
        """
        Recalculates all MonthlyContributionDue records affected when a contribution is voided/reversed.
        """
        affected_dues: List[MonthlyContributionDue] = []

        # Find all allocations for this contribution
        allocations = db.query(MonthlyContributionAllocation).filter(
            MonthlyContributionAllocation.contribution_id == contribution.id
        ).all()

        due_ids = [a.due_id for a in allocations]
        if contribution.due_id and contribution.due_id not in due_ids:
            due_ids.append(contribution.due_id)

        dues = db.query(MonthlyContributionDue).filter(MonthlyContributionDue.id.in_(due_ids)).all() if due_ids else []

        rules = MonthlyContributionService.get_contribution_rules(db)
        grace_days = rules["grace_period_days"]

        for due in dues:
            # Sum all non-voided allocations for this due
            paid_sum = db.query(func.coalesce(func.sum(MonthlyContributionAllocation.allocated_amount), Decimal("0.00")))\
                .join(Contribution, Contribution.id == MonthlyContributionAllocation.contribution_id)\
                .filter(
                    MonthlyContributionAllocation.due_id == due.id,
                    Contribution.is_voided == False
                ).scalar()

            total_paid = Decimal(str(paid_sum or 0.00))
            due.paid_amount = total_paid
            due.remaining_due = max(Decimal("0.00"), due.expected_amount - total_paid)
            due.status = MonthlyContributionService.evaluate_due_status(
                expected_amount=due.expected_amount,
                paid_amount=due.paid_amount,
                due_date=due.due_date,
                grace_period_days=grace_days
            )
            affected_dues.append(due)

        db.flush()
        return affected_dues

    @staticmethod
    def get_yearly_monthly_summary(
        db: Session,
        year: int,
        group_id: Optional[UUID] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 10
    ) -> Dict[str, Any]:
        """
        Calculates member-wise monthly contribution status for all 12 months of a selected year.
        Handles:
        - Multi-month allocations (including full 12-month advance payments)
        - Individual member pledges / global default contribution
        - Dynamic available years list
        - Pagination and group/search filtering
        - Correct status evaluation (PAID, DUE, OVERDUE, FUTURE)
        """
        today = date.today()
        first_of_current_month = date(today.year, today.month, 1)

        # 1. Discover available years from database
        year_set = set()
        min_contrib_date = db.query(func.min(Contribution.contribution_date)).filter(Contribution.is_voided == False).scalar()
        max_contrib_date = db.query(func.max(Contribution.contribution_date)).filter(Contribution.is_voided == False).scalar()
        if min_contrib_date:
            year_set.add(min_contrib_date.year)
        if max_contrib_date:
            year_set.add(max_contrib_date.year)

        min_alloc_month = db.query(func.min(MonthlyContributionAllocation.contribution_month)).scalar()
        max_alloc_month = db.query(func.max(MonthlyContributionAllocation.contribution_month)).scalar()
        if min_alloc_month:
            year_set.add(min_alloc_month.year)
        if max_alloc_month:
            year_set.add(max_alloc_month.year)

        # Always include a sensible range around current year and selected year
        current_year = today.year
        for y in range(min(current_year - 2, year - 1), max(current_year + 3, year + 2)):
            year_set.add(y)

        available_years = sorted(list(year_set), reverse=True)

        # 2. Query Members with filters
        query = db.query(Member).join(Group, Group.id == Member.group_id).filter(Member.is_active == True)

        if group_id:
            query = query.filter(Member.group_id == group_id)

        if search:
            search_pattern = f"%{search.strip()}%"
            query = query.filter(
                (Member.name.ilike(search_pattern)) |
                (Member.member_code.ilike(search_pattern)) |
                (Member.phone.ilike(search_pattern)) |
                (Group.name.ilike(search_pattern))
            )

        total_members = query.count()
        page = max(1, page)
        page_size = max(5, min(page_size, 100))
        total_pages = max(1, (total_members + page_size - 1) // page_size) if total_members > 0 else 1

        members = query.order_by(Member.name).offset((page - 1) * page_size).limit(page_size).all()

        if not members:
            return {
                "year": year,
                "available_years": available_years,
                "total_members": total_members,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages,
                "items": []
            }

        member_ids = [m.id for m in members]

        # 3. Pre-fetch all allocations for these members for the specified year
        year_start = date(year, 1, 1)
        year_end = date(year, 12, 31)

        allocations = db.query(
            MonthlyContributionAllocation.member_id,
            MonthlyContributionAllocation.contribution_month,
            func.sum(MonthlyContributionAllocation.allocated_amount).label("total_allocated"),
            Contribution.receipt_number
        ).join(Contribution, Contribution.id == MonthlyContributionAllocation.contribution_id)\
        .filter(
            MonthlyContributionAllocation.member_id.in_(member_ids),
            MonthlyContributionAllocation.contribution_month >= year_start,
            MonthlyContributionAllocation.contribution_month <= year_end,
            Contribution.is_voided == False
        ).group_by(
            MonthlyContributionAllocation.member_id,
            MonthlyContributionAllocation.contribution_month,
            Contribution.receipt_number
        ).all()

        # Mapping: (member_id, month_date) -> {paid: Decimal, receipts: list}
        alloc_map: Dict[tuple, Dict[str, Any]] = {}
        for r in allocations:
            m_id = r[0]
            c_month = r[1]
            amt = Decimal(str(r[2] or 0))
            rec = r[3]
            key = (m_id, c_month)
            if key not in alloc_map:
                alloc_map[key] = {"paid": Decimal("0.00"), "receipts": []}
            alloc_map[key]["paid"] += amt
            if rec and rec not in alloc_map[key]["receipts"]:
                alloc_map[key]["receipts"].append(rec)

        # Fallback for legacy unallocated contributions if any
        legacy_contribs = db.query(
            Contribution.member_id,
            Contribution.contribution_month,
            func.sum(Contribution.amount).label("total_direct"),
            Contribution.receipt_number
        ).filter(
            Contribution.member_id.in_(member_ids),
            Contribution.contribution_month >= year_start,
            Contribution.contribution_month <= year_end,
            Contribution.is_voided == False,
            ~Contribution.id.in_(
                db.query(MonthlyContributionAllocation.contribution_id).filter(
                    MonthlyContributionAllocation.member_id.in_(member_ids)
                )
            )
        ).group_by(
            Contribution.member_id,
            Contribution.contribution_month,
            Contribution.receipt_number
        ).all()

        for r in legacy_contribs:
            m_id = r[0]
            c_month = r[1]
            amt = Decimal(str(r[2] or 0))
            rec = r[3]
            key = (m_id, c_month)
            if key not in alloc_map:
                alloc_map[key] = {"paid": Decimal("0.00"), "receipts": []}
            alloc_map[key]["paid"] += amt
            if rec and rec not in alloc_map[key]["receipts"]:
                alloc_map[key]["receipts"].append(rec)

        # 4. Cycle rules
        rules = MonthlyContributionService.get_contribution_rules(db)
        due_day = rules["monthly_due_day"]
        grace_days = rules["grace_period_days"]

        MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

        items = []
        for m in members:
            expected_monthly = MonthlyContributionService.get_member_expected_amount(db, m)
            month_statuses = []
            total_year_paid = Decimal("0.00")
            total_year_expected = expected_monthly * Decimal("12")

            for m_idx in range(1, 13):
                month_date = date(year, m_idx, 1)
                month_name = MONTH_NAMES[m_idx - 1]
                due_date = date(year, m_idx, min(due_day, 28))
                grace_deadline = due_date + timedelta(days=grace_days)

                alloc_info = alloc_map.get((m.id, month_date), {"paid": Decimal("0.00"), "receipts": []})
                paid_amt = alloc_info["paid"]
                receipts = alloc_info["receipts"]
                total_year_paid += paid_amt

                # Status priority:
                # 1. PAID (including prepaid advances)
                # 2. DUE (past unpaid months in current year, or unpaid months in previous years)
                # 3. CURRENT PENDING (ongoing calendar month unpaid)
                # 4. FUTURE MONTH (unpaid upcoming months in current year or future years)
                if paid_amt >= expected_monthly and expected_monthly > Decimal("0.00"):
                    status = "PAID"
                elif year < today.year:
                    status = "DUE"
                elif year > today.year:
                    status = "FUTURE_MONTH"
                else:
                    # selected_year == today.year
                    if m_idx < today.month:
                        status = "DUE"
                    elif m_idx == today.month:
                        status = "CURRENT_PENDING"
                    else:
                        status = "FUTURE_MONTH"

                month_statuses.append({
                    "month_index": m_idx,
                    "month_name": month_name,
                    "month_date": month_date,
                    "status": status,
                    "expected_amount": expected_monthly,
                    "paid_amount": paid_amt,
                    "receipt_numbers": receipts
                })

            items.append({
                "member_id": m.id,
                "member_code": m.member_code,
                "name": m.name,
                "phone": m.phone,
                "group_id": m.group_id,
                "group_name": m.group.name if m.group else "General Group",
                "monthly_expected_amount": expected_monthly,
                "total_year_paid": total_year_paid,
                "total_year_expected": total_year_expected,
                "months": month_statuses
            })

        return {
            "year": year,
            "available_years": available_years,
            "total_members": total_members,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "items": items
        }
